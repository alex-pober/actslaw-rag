// lib/smartadvocate/enhanced-client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  cache?: boolean;
  cacheDuration?: number; // in milliseconds
}

interface CacheEntry {
  data: any;
  timestamp: number;
  duration: number;
}

class SmartAdvocateClient {
  private supabase;
  private cache = new Map<string, CacheEntry>();
  private defaultCacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.supabase = createClientComponentClient();
  }

  private getCacheKey(endpoint: string, params?: Record<string, string>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramString}`;
  }

  private isValidCache(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.duration;
  }

  private setCache(key: string, data: any, duration: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration
    });
  }

  private getCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && this.isValidCache(entry)) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  async makeRequest(endpoint: string, options: RequestOptions = {}) {
    const {
      cache = false,
      cacheDuration = this.defaultCacheDuration,
      ...requestOptions
    } = options;

    // Check cache for GET requests
    if (requestOptions.method === 'GET' || !requestOptions.method) {
      if (cache) {
        const cacheKey = this.getCacheKey(endpoint, requestOptions.params);
        const cachedData = this.getCache(cacheKey);
        if (cachedData) {
          console.log(`Cache hit for ${endpoint}`);
          return cachedData;
        }
      }
    }

    // Get the current user's session
    const { data: { session }, error } = await this.supabase.auth.getSession();

    if (error || !session) {
      throw new Error('User not authenticated');
    }

    // Build URL with query parameters
    const url = new URL(`/api/smartadvocate/${endpoint}`, window.location.origin);
    if (requestOptions.params) {
      Object.entries(requestOptions.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    console.log(`Making request to: ${url.toString()}`);

    // Make request to your API route
    const response = await fetch(url.toString(), {
      method: requestOptions.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...requestOptions.headers
      },
      body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    // Cache successful GET requests
    if ((requestOptions.method === 'GET' || !requestOptions.method) && cache) {
      const cacheKey = this.getCacheKey(endpoint, requestOptions.params);
      this.setCache(cacheKey, data, cacheDuration);
      console.log(`Cached response for ${endpoint}`);
    }

    return data;
  }

  // Clear cache for a specific endpoint or all cache
  clearCache(endpoint?: string, params?: Record<string, string>): void {
    if (endpoint) {
      const cacheKey = this.getCacheKey(endpoint, params);
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }

  async getCase(caseSA: string | number) {
    return this.makeRequest(`case/CaseInfo?Casenumber=${caseSA}`, {
      cache: true,
      cacheDuration: 5 * 60 * 1000 // 5 minutes for individual cases
    });
  }

  // async getCaseDocuments(caseSA: string | number) {
  //   return this.makeRequest(`case/${caseSA}/documents`, {
  //     cache: true,
  //     cacheDuration: 2 * 60 * 1000 // 2 minutes for documents
  //   });
  // }

  // async getCaseNotes(caseSA: string | number) {
  //   return this.makeRequest(`case/${caseSA}/notes?currentPage=0&pageSize=200`, {
  //     cache: true,
  //     cacheDuration: 30 * 1000 // 30 seconds for notes (more dynamic)
  //   });
  // }

  // Dedicated case methods
  async getCaseDocuments(caseId: string) {
    return this.makeRequest(`case/${caseId}/documents?currentPage=0&pageSize=200`);
  }

  async getCaseNotes(caseNumber: string) {
    return this.makeRequest(`case/${caseNumber}/notes`);
  }

  async getCaseContacts(caseNumber: string) {
    return this.makeRequest(`case/${caseNumber}/contacts`);
  }

  // Document methods
  async getDocuments(params?: Record<string, string>) {
    return this.makeRequest('documents', {
      params,
      cache: true,
      cacheDuration: 5 * 60 * 1000
    });
  }

  async getDocument(documentId: string | number) {
    return this.makeRequest(`documents/${documentId}`, {
      cache: true,
      cacheDuration: 30 * 60 * 1000 // 30 minutes for individual documents
    });
  }

  // Bulk operations for efficiency
  async getBulkCaseData(caseSA: string | number) {
    const promises = [
      this.getCase(caseSA),
      this.getCaseDocuments(caseSA),
      this.getCaseNotes(caseSA)
    ];

    try {
      const [caseData, documents, notes] = await Promise.allSettled(promises);

      return {
        case: caseData.status === 'fulfilled' ? caseData.value : null,
        documents: documents.status === 'fulfilled' ? documents.value : [],
        notes: notes.status === 'fulfilled' ? notes.value : []
      };
    } catch (error) {
      console.error('Error fetching bulk case data:', error);
      throw error;
    }
  }

  async getDocumentContent(documentId: string | number) {
  // Get the current user's session
  const { data: { session }, error } = await this.supabase.auth.getSession();

  if (error || !session) {
    throw new Error('User not authenticated');
  }

  const url = new URL(`/api/smartadvocate/case/document/${documentId}/content`, window.location.origin);

  console.log(`Making request to: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API request failed: ${response.statusText} ${JSON.stringify(errorData)}`);
  }

  // Get the content type to determine how to handle the response
  const contentType = response.headers.get('content-type') || '';
  const contentLength = response.headers.get('content-length') || '0';

  console.log(`Document ${documentId} response:`, {
    contentType,
    contentLength,
    status: response.status
  });

  // Log raw response data for debugging
  const responseClone = response.clone();
  const arrayBuffer = await responseClone.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  console.log(`Raw response data for document ${documentId}:`, {
    byteLength: arrayBuffer.byteLength,
    first20Bytes: Array.from(uint8Array.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '),
    firstBytesAsString: String.fromCharCode.apply(null, Array.from(uint8Array.slice(0, 50))),
    contentType,
    headers: Object.fromEntries(response.headers.entries())
  });

  // If it's JSON, parse it
  if (contentType.includes('application/json')) {
    return await response.json();
  }

  // For PDFs, create a blob URL directly from the response
  if (contentType.includes('application/pdf')) {
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    console.log(`Created PDF blob URL for document ${documentId}:`, blobUrl);

    return {
      content: null,
      contentType: 'application/pdf',
      downloadUrl: blobUrl,
      fileName: `document_${documentId}.pdf`,
      fileSize: parseInt(contentLength, 10) || blob.size,
      isPDFBlob: true
    };
  }

  // For MSG files and other binary content (including DOCX), we need to examine the content
  if (contentType.includes('application/vnd.ms-outlook') ||
      contentType.includes('application/octet-stream')) {

    // Get the binary data to examine file signatures
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Check for different file signatures
    const oleSignature = Array.from(uint8Array.slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const zipSignature = Array.from(uint8Array.slice(0, 4))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const isMSG = oleSignature === 'd0cf11e0a1b11ae1'; // OLE compound document signature
    const isZip = zipSignature === '504b0304'; // ZIP signature (DOCX files are ZIP archives)

    console.log(`Document ${documentId} signatures - OLE: ${oleSignature}, ZIP: ${zipSignature}, isMSG: ${isMSG}, isZip: ${isZip}`);

    // Check if it's a DOCX file (ZIP archive containing Office Open XML)
    if (isZip) {
      // DOCX files are ZIP archives, so create a proper DOCX blob
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const blobUrl = URL.createObjectURL(blob);

      console.log(`Created DOCX blob URL for document ${documentId}:`, blobUrl);

      return {
        content: null,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        downloadUrl: blobUrl,
        fileName: `document_${documentId}.docx`,
        fileSize: arrayBuffer.byteLength,
        isDOCXFile: true,
        rawBlob: blob // Store the actual blob for docx-preview
      };
    }

    if (isMSG) {
      // For MSG files, we'll try to extract readable content
      // Since we can't parse MSG directly in browser, we'll download it
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.ms-outlook' });
      const blobUrl = URL.createObjectURL(blob);

      return {
        content: null,
        contentType: 'application/vnd.ms-outlook',
        downloadUrl: blobUrl,
        fileName: `document_${documentId}.msg`,
        fileSize: arrayBuffer.byteLength,
        isMSGFile: true,
        rawData: arrayBuffer
      };
    }

    // If not MSG or DOCX, handle as generic binary
    const blob = new Blob([arrayBuffer], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);

    return {
      content: null,
      contentType: contentType,
      downloadUrl: blobUrl,
      fileName: `document_${documentId}.bin`,
      fileSize: arrayBuffer.byteLength,
      isBinaryFile: true
    };
  }

  // For images, handle as blob
  if (contentType.includes('image/')) {
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    return {
      content: null,
      contentType: contentType,
      downloadUrl: blobUrl,
      fileName: `document_${documentId}.${contentType.split('/')[1]}`,
      fileSize: blob.size
    };
  }

  // For all other content, get as text
  const textContent = await response.text();
  console.log(`Document ${documentId} text content length:`, textContent.length);

  return {
    content: textContent,
    contentType: contentType || 'text/plain',
    fileName: `document_${documentId}.txt`,
    fileSize: textContent.length
  };
  }

  async downloadDocument(documentId: string | number) {
  // For downloads, we need to handle binary data differently
  const { data: { session }, error } = await this.supabase.auth.getSession();

  if (error || !session) {
    throw new Error('User not authenticated');
  }

  const url = new URL(`/api/smartadvocate/case/document/${documentId}/content`, window.location.origin);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  // Check if response is already a blob/binary
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/octet-stream'))) {
    return response.blob();
  }

  // If it's text (like your PDF content), we need to handle it differently
  const textContent = await response.text();

  // Check if it looks like PDF content
  if (textContent.startsWith('%PDF-')) {
    // Convert the text to a proper PDF blob
    const pdfBytes = new Uint8Array(textContent.length);
    for (let i = 0; i < textContent.length; i++) {
      pdfBytes[i] = textContent.charCodeAt(i);
    }
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // For other text content, return as text blob
  return new Blob([textContent], { type: 'text/plain' });
  }
}

export default new SmartAdvocateClient();
