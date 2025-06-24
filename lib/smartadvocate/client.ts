// lib/smartadvocate/enhanced-client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface DocumentContent {
  content?: string;
  contentType: string;
  downloadUrl?: string;
  fileName: string;
  fileSize: number;
  isDOCXFile?: boolean;
  isMSGFile?: boolean;
  isPDFBlob?: boolean;
  isBinaryFile?: boolean;
  rawBlob?: Blob;
  rawData?: ArrayBuffer;
}

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

  async getDocument(documentId: string) {
    return this.makeRequest(`case/document/${documentId}`);
  }

  async getCaseNotes(caseId: string) {
    return this.makeRequest(`case/${caseId}/notes?currentPage=0&pageSize=200`);
  }

  async getCaseTasks(caseId: string) {
    return this.makeRequest(`case/${caseId}/task?currentPage=0&pageSize=200`);
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

  async getDocumentContent(documentId: string | number, documentName?: string): Promise<DocumentContent> {
    // Get the current user's session
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
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length') || '0';

    console.log(`Response for document ${documentId}:`, {
      contentType,
      contentLength,
      status: response.status,
      documentName,
    });

    const extension = documentName ? documentName.split('.').pop()?.toLowerCase() : '';

    // Priority 1: Handle based on file extension for known types that need binary handling
    if (extension === 'docx') {
      console.log(`Handling as DOCX based on extension for document ${documentId}`);
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const blobUrl = URL.createObjectURL(blob);
      return {
        content: undefined,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        downloadUrl: blobUrl,
        fileName: documentName || `document_${documentId}.docx`,
        fileSize: arrayBuffer.byteLength,
        isDOCXFile: true,
        rawBlob: blob,
      };
    }

    if (extension === 'msg') {
      console.log(`Handling as MSG based on extension for document ${documentId}`);
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.ms-outlook' });
      const blobUrl = URL.createObjectURL(blob);
      return {
        content: undefined,
        contentType: 'application/vnd.ms-outlook',
        downloadUrl: blobUrl,
        fileName: documentName || `document_${documentId}.msg`,
        fileSize: arrayBuffer.byteLength,
        isMSGFile: true,
        rawData: arrayBuffer,
      };
    }

    // Priority 2: Handle based on Content-Type header
    if (contentType.includes('application/pdf')) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      console.log(`Created PDF blob URL for document ${documentId}:`, blobUrl);
      return {
        content: undefined,
        contentType: 'application/pdf',
        downloadUrl: blobUrl,
        fileName: `document_${documentId}.pdf`,
        fileSize: parseInt(contentLength, 10) || blob.size,
        isPDFBlob: true,
      };
    }
    
    if (contentType.includes('image/')) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      return {
        content: undefined,
        contentType: contentType,
        downloadUrl: blobUrl,
        fileName: `document_${documentId}.${contentType.split('/')[1]}`,
        fileSize: blob.size,
      };
    }
    
    // Handle generic binary stream if not identified by extension
    if (contentType.includes('application/octet-stream')) {
        console.log(`Handling as generic binary stream for document ${documentId}`);
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        return {
            content: undefined,
            contentType: contentType,
            downloadUrl: blobUrl,
            fileName: documentName || `document_${documentId}.bin`,
            fileSize: arrayBuffer.byteLength,
            isBinaryFile: true,
        };
    }

    // Fallback: Handle as text
    console.log(`Falling back to text handling for document ${documentId}`);
    const textContent = await response.text();
    return {
      content: textContent,
      contentType: contentType || 'text/plain',
      fileName: `document_${documentId}.txt`,
      fileSize: textContent.length,
    };
  }

  async downloadDocument(documentId: string | number): Promise<Blob> {
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
