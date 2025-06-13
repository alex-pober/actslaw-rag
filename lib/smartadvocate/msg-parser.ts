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
    const result: MSGContent = {
      subject: cleanText(fileData.subject),
      from: extractSenderInfo(fileData),
      body: cleanBodyText(fileData.body),
      htmlBody: fileData.bodyHtml || undefined,
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
