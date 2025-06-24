// lib/smartadvocate/msg-parser.ts - Simplified and robust MSG parser
import MsgReader from '@kenjiuno/msgreader';

export interface MSGContent {
  subject?: string;
  from?: string;
  to?: string;
  cc?: string;
  date?: string;
  body?: string;
  htmlBody?: string;
  attachments?: Array<{
    fileName: string;
    contentLength: number;
    dataId: number;
  }>;
}

/**
 * Parse an Outlook .msg file
 * @param arrayBuffer The MSG file as ArrayBuffer
 * @returns Parsed email content
 */
export function parseMSGFile(arrayBuffer: ArrayBuffer): MSGContent {
  try {
    const msgReader = new MsgReader(arrayBuffer);
    const fileData = msgReader.getFileData();

    if (!fileData) {
      throw new Error('No data found in MSG file');
    }

    // Extract basic email information
    const sanitizedHtmlBody = sanitizeHTML(fileData.bodyHtml || undefined);

    // Prefer plain text body; if missing derive it from the HTML version
    const plainBody =
      cleanBodyText(fileData.body) ||
      (sanitizedHtmlBody ? cleanBodyText(htmlToPlainText(sanitizedHtmlBody)) : undefined);

    // Process the plain body to make URLs clickable
    const bodyWithClickableLinks = plainBody ? convertUrlsToLinks(plainBody) : undefined;

    const result: MSGContent = {
      subject: cleanText(fileData.subject),
      from: extractSenderInfo(fileData),
      body: plainBody,
      htmlBody: bodyWithClickableLinks || sanitizedHtmlBody,
      attachments: extractAttachments(fileData.attachments || []),
    };

    // Extract recipients
    const recipients = extractRecipients(fileData.recipients || []);
    if (recipients.to.length > 0) {
      result.to = recipients.to.join('; ');
    }
    if (recipients.cc.length > 0) {
      result.cc = recipients.cc.join('; ');
    }

    // Extract date
    result.date = extractDate(fileData);

    return result;
  } catch (error) {
    console.error('Error parsing MSG file:', error);
    return {
      body: `Error parsing MSG file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Extract sender information with fallbacks
 */
function extractSenderInfo(fileData: any): string | undefined {
  // Try direct email field first
  if (fileData.senderEmail && isValidEmail(fileData.senderEmail)) {
    return fileData.senderEmail;
  }

  // Try sender name if it contains an email
  if (fileData.senderName && isValidEmail(fileData.senderName)) {
    return fileData.senderName;
  }

  // Try extracting from headers
  if (fileData.headers) {
    const fromMatch = fileData.headers.match(/From:\s*(?:[^<]*<([^>]+)>|([^\s@]+@[^\s@]+\.[^\s@]+))/i);
    if (fromMatch) {
      return fromMatch[1] || fromMatch[2];
    }
  }

  // Return sender name if we have it, even if not an email
  return fileData.senderName || undefined;
}

/**
 * Extract and categorize recipients
 */
function extractRecipients(recipients: any[]): { to: string[]; cc: string[] } {
  const to: string[] = [];
  const cc: string[] = [];

  if (!Array.isArray(recipients)) {
    return { to, cc };
  }

  recipients.forEach((recipient) => {
    const email = extractEmailFromRecipient(recipient);
    if (!email) return;

    // Determine recipient type (default to 'to' if not specified)
    const recipType = recipient.recipType?.toLowerCase() || 'to';

    if (recipType === 'cc') {
      cc.push(email);
    } else {
      to.push(email);
    }
  });

  return { to, cc };
}

/**
 * Extract email from recipient object
 */
function extractEmailFromRecipient(recipient: any): string | null {
  // Try email field first
  if (recipient.email && isValidEmail(recipient.email)) {
    return recipient.email;
  }

  // Try name field if it's an email
  if (recipient.name && isValidEmail(recipient.name)) {
    return recipient.name;
  }

  // Try display name if it contains an email
  if (recipient.displayName) {
    const emailMatch = recipient.displayName.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
    if (emailMatch) {
      return emailMatch[1];
    }
  }

  return null;
}

/**
 * Extract date from various sources
 */
function extractDate(fileData: any): string | undefined {
  // Try message creation date first
  if (fileData.creationTime) {
    try {
      const date = new Date(fileData.creationTime);
      if (!isNaN(date.getTime())) {
        return formatDate(date);
      }
    } catch (error) {
      // Continue to next method
    }
  }

  // Try extracting from headers
  if (fileData.headers) {
    const dateMatch = fileData.headers.match(/Date:\s*([^\r\n]+)/i);
    if (dateMatch) {
      try {
        const date = new Date(dateMatch[1].trim());
        if (!isNaN(date.getTime())) {
          return formatDate(date);
        }
      } catch (error) {
        console.warn('Failed to parse date from headers:', dateMatch[1]);
      }
    }
  }

  return undefined;
}

/**
 * Extract attachments information
 */
function extractAttachments(attachments: any[]): Array<{ fileName: string; contentLength: number; dataId: number }> {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.map((att) => ({
    fileName: att.fileName || att.fileNameShort || 'unknown',
    contentLength: att.contentLength || 0,
    dataId: att.dataId || 0,
  }));
}

/**
 * Check if string is a valid email address
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email.trim());
}

/**
 * Clean text content with minimal processing
 */
function cleanText(text: string | undefined): string | undefined {
  if (!text) return undefined;

  return text
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim() || undefined;
}

/**
 * Clean body text with minimal processing to preserve content
 */
function cleanBodyText(body: string | undefined): string | undefined {
  if (!body) return undefined;

  return body
    .replace(/\r\n/g, '\n')
    .replace(/\n{2}/g, '\n') // Convert double newlines to single
    .replace(/\n{4,}/g, '\n') // Limit consecutive newlines to 3 max
    .replace(/\n{3}/g, '\n') // Convert triple newlines to double
    .replace(/[ \t]+$/gm, '') // Remove trailing spaces/tabs from each line
    .replace(/[ \t]{2,}/g, ' ') // Replace multiple spaces/tabs with single space
    .trim() || undefined;
}

/**
 * Format date consistently
 */
function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Very small HTML sanitizer – strips <script>, <style> tags and dangerous inline handlers.
 * NOTE:  This is a *minimal* solution to avoid extra dependencies.  For full-blown
 * sanitisation consider using a dedicated library (e.g. DOMPurify) on the client.
 */
function sanitizeHTML(html: string | undefined): string | undefined {
  if (!html) return undefined;

  let sanitized = html
    // Remove script & style blocks (including their content)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Strip inline `on*="…"` / `on*='…'` event handlers
  sanitized = sanitized.replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '');

  return sanitized.trim() || undefined;
}

/**
 * Convert a subset of HTML to plain text so we have a fallback when the MSG
 * lacks a dedicated plain-text body.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/?(br|p|div)[^>]*>/gi, '\n') // Break‐like tags ➜ newline
    .replace(/<[^>]+>/g, '')                     // Strip remaining tags
    .replace(/&nbsp;/gi, ' ')                    // Entity decode (minimal set)
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

/**
 * Extract attachment content from MSG file
 * @param arrayBuffer The MSG file as ArrayBuffer
 * @param attachmentIndex The index of the attachment to extract
 * @returns The attachment content as Uint8Array or null if not found
 */
export function getMSGAttachment(arrayBuffer: ArrayBuffer, attachmentIndex: number): Uint8Array | null {
  try {
    const msgReader = new MsgReader(arrayBuffer);
    const fileData = msgReader.getFileData();

    if (!fileData?.attachments || !Array.isArray(fileData.attachments)) {
      return null;
    }

    const attachment = fileData.attachments[attachmentIndex];
    if (!attachment) {
      return null;
    }

    const attachmentData = msgReader.getAttachment(attachment);
    return attachmentData?.content || null;
  } catch (error) {
    console.error('Error extracting MSG attachment:', error);
    return null;
  }
}

/**
 * Detect URLs in text and convert them to clickable HTML links
 * This preserves line breaks and spaces while making URLs clickable
 */
function convertUrlsToLinks(text: string): string {
  // URL regex pattern that matches common URL formats
  // This regex matches URLs starting with http://, https://, www. or common TLDs
  const urlRegex = /(?:(?:https?:\/\/)|(?:www\.))[^\s<]+\.[^\s\n\r<),.;!"']+/gi;
  
  // First, find all URLs and store them with placeholders
  const urls: string[] = [];
  let processedText = text.replace(urlRegex, (url) => {
    urls.push(url);
    return `__URL_PLACEHOLDER_${urls.length - 1}__`;
  });
  
  // Replace line breaks with <br> tags to preserve formatting
  processedText = processedText.replace(/\n/g, '<br>');
  
  // Restore URLs as clickable links
  processedText = processedText.replace(/__URL_PLACEHOLDER_(\d+)__/g, (match, index) => {
    const url = urls[parseInt(index)];
    // Ensure URL has protocol for href
    const href = url.startsWith('www.') ? `https://${url}` : url;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline">${url}</a>`;
  });
  
  return processedText;
}
