// lib/smartadvocate/msg-parser.ts - Using proper library
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

export function parseMSGFile(arrayBuffer: ArrayBuffer): MSGContent {
  try {
    // Convert ArrayBuffer to Buffer/Uint8Array as expected by the library
    const uint8Array = new Uint8Array(arrayBuffer);

    // Create MSG reader instance
    const msgReader = new MsgReader(uint8Array);

    // Extract the file data
    const fileData = msgReader.getFileData();

    console.log('MSG file data extracted:', fileData);

    // Helper function to extract real email from Exchange DN or display name
    const extractEmailAddress = (rawAddress: string, displayName?: string): string => {
      if (!rawAddress) return '';

      // If it's already a proper email address, return it
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailPattern.test(rawAddress)) {
        return rawAddress;
      }

      // If it's an Exchange DN (starts with /o= or /O=), try to extract from display name or headers
      if (rawAddress.startsWith('/o=') || rawAddress.startsWith('/O=')) {
        // Try to find email in the display name
        if (displayName) {
          const emailMatch = displayName.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
          if (emailMatch) {
            return emailMatch[1];
          }
        }

        // Try to extract from headers if available
        if (fileData.headers) {
          // Look for the email in headers by searching for the DN
          const headerLines = fileData.headers.split(/\r?\n/);
          for (const line of headerLines) {
            if (line.includes(rawAddress)) {
              const emailMatch = line.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
              if (emailMatch) {
                return emailMatch[1];
              }
            }
          }
        }

        // If we can't find the email, return a cleaned version of the display name
        return displayName || 'Unknown Email';
      }

      return rawAddress;
    };

    // Extract sender information
    let senderEmail = '';
    let senderName = '';

    if (fileData.senderEmail) {
      senderEmail = extractEmailAddress(fileData.senderEmail, fileData.senderName);
    } else if (fileData.senderName) {
      senderEmail = extractEmailAddress(fileData.senderName);
    }

    // Try to extract sender from headers as fallback
    if ((!senderEmail || senderEmail.startsWith('/o=')) && fileData.headers) {
      const fromMatch = fileData.headers.match(/From:\s*[^<]*<([^>]+)>/i) ||
                       fileData.headers.match(/From:\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i);
      if (fromMatch) {
        senderEmail = fromMatch[1];
      }
    }

    // Map the library's output to our interface
    const result: MSGContent = {
      subject: fileData.subject || undefined,
      from: senderEmail || undefined,
      body: fileData.body || undefined,
      htmlBody: fileData.bodyHTML || undefined,
      attachments: fileData.attachments?.map(att => ({
        fileName: att.fileName || att.fileNameShort || 'unknown',
        contentLength: att.contentLength || 0,
        dataId: att.dataId || 0
      })) || []
    };

    // Extract recipients with proper email resolution
    if (fileData.recipients && Array.isArray(fileData.recipients)) {
      const toRecipients: string[] = [];
      const ccRecipients: string[] = [];

      fileData.recipients.forEach((recipient: any) => {
        let email = recipient.email || recipient.name || '';
        const displayName = recipient.displayName || recipient.name;

        // Extract real email address
        email = extractEmailAddress(email, displayName);

        if (email && email !== 'Unknown Email') {
          if (recipient.recipType === 'to' || !recipient.recipType) {
            toRecipients.push(email);
          } else if (recipient.recipType === 'cc') {
            ccRecipients.push(email);
          }
        }
      });

      // Fallback: try to extract from headers if recipients are empty or have Exchange DNs
      if ((toRecipients.length === 0 || toRecipients.some(r => r.startsWith('/o='))) && fileData.headers) {
        const toMatch = fileData.headers.match(/To:\s*([^\r\n]+)/i);
        if (toMatch) {
          const emails = toMatch[1].match(/([^\s@]+@[^\s@]+\.[^\s@]+)/g);
          if (emails) {
            toRecipients.length = 0; // Clear existing
            toRecipients.push(...emails);
          }
        }

        const ccMatch = fileData.headers.match(/CC:\s*([^\r\n]+)/i);
        if (ccMatch) {
          const emails = ccMatch[1].match(/([^\s@]+@[^\s@]+\.[^\s@]+)/g);
          if (emails) {
            ccRecipients.length = 0; // Clear existing
            ccRecipients.push(...emails);
          }
        }
      }

      if (toRecipients.length > 0) {
        result.to = toRecipients.join('; ');
      }
      if (ccRecipients.length > 0) {
        result.cc = ccRecipients.join('; ');
      }
    }

    // Extract date from headers if available
    if (fileData.headers) {
      const dateMatch = fileData.headers.match(/Date:\s*([^\r\n]+)/i);
      if (dateMatch) {
        try {
          const date = new Date(dateMatch[1].trim());
          if (!isNaN(date.getTime())) {
            result.date = date.toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        } catch (error) {
          console.warn('Failed to parse date:', dateMatch[1]);
        }
      }
    }

    // Clean up body text
    if (result.body) {
      result.body = result.body
        .replace(/\r\n/g, '\n')
        .replace(/\n+/g, '\n')
        // Fix spacing around apostrophes (only when there's excessive whitespace)
        .replace(/\s{2,}'/g, "'")  // Remove multiple spaces before apostrophes
        .replace(/'\s{2,}/g, "'")  // Remove multiple spaces after apostrophes
        .replace(/\s'\s/g, "'")    // Fix " ' " pattern to "'"
        // Fix spacing around quotes (only excessive whitespace)
        .replace(/\s{2,}"/g, '"')  // Remove multiple spaces before quotes
        .replace(/"\s{2,}/g, '"')  // Remove multiple spaces after quotes
        .replace(/\s"\s/g, '"')    // Fix " " " pattern to '"'
        // Fix multiple spaces but preserve single spaces
        .replace(/[ \t]{2,}/g, ' ') // Replace 2+ spaces/tabs with single space
        // Fix obvious punctuation spacing issues (only when there's no space)
        .replace(/([a-zA-Z])\.([A-Z])/g, '$1. $2')   // Add space after period before capital letter
        .replace(/([a-zA-Z]),([A-Za-z])/g, '$1, $2')  // Add space after comma before letter
        .trim();
    }

    // Also clean up the subject line with the same pattern
    if (result.subject) {
      result.subject = result.subject
        .replace(/\s{2,}'/g, "'")
        .replace(/'\s{2,}/g, "'")
        .replace(/\s'\s/g, "'")
        .replace(/\s{2,}"/g, '"')
        .replace(/"\s{2,}/g, '"')
        .replace(/\s"\s/g, '"')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
    }

    return result;
  } catch (error) {
    console.error('Error parsing MSG file with library:', error);
    return {
      body: `Failed to parse MSG file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Helper function to get attachment content
export function getMSGAttachment(arrayBuffer: ArrayBuffer, attachmentIndex: number): Uint8Array | null {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const msgReader = new MsgReader(uint8Array);
    const fileData = msgReader.getFileData();

    if (fileData.attachments && fileData.attachments[attachmentIndex]) {
      const attachment = msgReader.getAttachment(fileData.attachments[attachmentIndex]);
      return attachment?.content || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting MSG attachment:', error);
    return null;
  }
}
