// Add this utility function to lib/smartadvocate/client.ts or create a new file lib/utils/msg-parser.ts

export interface MSGContent {
  subject?: string;
  from?: string;
  to?: string;
  cc?: string;
  date?: string;
  body?: string;
  htmlBody?: string;
  attachments?: string[];
}

export function parseMSGFile(arrayBuffer: ArrayBuffer): MSGContent {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const result: MSGContent = {};

    // Convert to string for text searching (this is a very basic approach)
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let content = decoder.decode(uint8Array);

    // Try Latin-1 if UTF-8 fails to produce readable content
    if (content.includes('�') || content.length === 0) {
      const latin1Decoder = new TextDecoder('latin1');
      content = latin1Decoder.decode(uint8Array);
    }

    // Extract common email fields using simple pattern matching
    // Note: This is a basic approach and won't work for all MSG files

    // Subject
    const subjectMatch = content.match(/Subject[:\s]+([^\r\n]+)/i);
    if (subjectMatch) {
      result.subject = subjectMatch[1].trim();
    }

    // From
    const fromMatch = content.match(/From[:\s]+([^\r\n]+)/i);
    if (fromMatch) {
      result.from = fromMatch[1].trim();
    }

    // To
    const toMatch = content.match(/To[:\s]+([^\r\n]+)/i);
    if (toMatch) {
      result.to = toMatch[1].trim();
    }

    // CC
    const ccMatch = content.match(/CC[:\s]+([^\r\n]+)/i);
    if (ccMatch) {
      result.cc = ccMatch[1].trim();
    }

    // Date
    const dateMatch = content.match(/Date[:\s]+([^\r\n]+)/i);
    if (dateMatch) {
      result.date = dateMatch[1].trim();
    }

    // Try to extract body content
    // Look for common patterns that might indicate email body
    const bodyPatterns = [
      /\r?\n\r?\n([^]+?)(?:\r?\n\r?\n|\r?\n-{2,}|\r?\nFrom:|\r?\n_{5,}|$)/,
      /Message-ID[^\r\n]*\r?\n\r?\n([^]+?)(?:\r?\n\r?\n|$)/,
      /Content-Type[^\r\n]*\r?\n\r?\n([^]+?)(?:\r?\n\r?\n|$)/
    ];

    for (const pattern of bodyPatterns) {
      const bodyMatch = content.match(pattern);
      if (bodyMatch && bodyMatch[1].trim().length > 10) {
        result.body = bodyMatch[1].trim();
        break;
      }
    }

    // If no body found, try to get any readable text
    if (!result.body) {
      // Extract readable text (printable ASCII characters)
      const readableText = content.match(/[a-zA-Z0-9\s.,!?;:'"@()-]{20,}/g);
      if (readableText && readableText.length > 0) {
        // Take the longest readable string as potential body
        result.body = readableText
          .sort((a, b) => b.length - a.length)[0]
          .trim();
      }
    }

    // Clean up the body if found
    if (result.body) {
      result.body = result.body
        .replace(/\x00/g, '') // Remove null bytes
        .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }

    return result;
  } catch (error) {
    console.error('Error parsing MSG file:', error);
    return {
      body: 'Unable to parse MSG file content. This may be due to encryption or a complex file structure.'
    };
  }
}
