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

  // Case-related methods with caching
  async getCases(params?: Record<string, string>) {
    return this.makeRequest('case/CaseInfo', {
      params,
      cache: true,
      cacheDuration: 10 * 60 * 1000 // 10 minutes for case lists
    });
  }

  async getCase(caseSA: string | number) {
    return this.makeRequest(`case/CaseInfo?Casenumber=${caseSA}`, {
      cache: true,
      cacheDuration: 5 * 60 * 1000 // 5 minutes for individual cases
    });
  }

  async getCaseDocuments(caseSA: string | number) {
    return this.makeRequest(`case/${caseSA}/documents`, {
      cache: true,
      cacheDuration: 2 * 60 * 1000 // 2 minutes for documents
    });
  }

  async getCaseNotes(caseSA: string | number) {
    return this.makeRequest(`case/${caseSA}/notes`, {
      cache: true,
      cacheDuration: 30 * 1000 // 30 seconds for notes (more dynamic)
    });
  }

  async getCaseTasks(caseSA: string | number) {
    return this.makeRequest(`case/${caseSA}/tasks`, {
      cache: true,
      cacheDuration: 60 * 1000 // 1 minute for tasks
    });
  }

  async getCaseTimeline(caseSA: string | number) {
    return this.makeRequest(`case/${caseSA}/timeline`, {
      cache: true,
      cacheDuration: 5 * 60 * 1000 // 5 minutes for timeline
    });
  }

  async getCaseContacts(caseSA: string | number) {
    return this.makeRequest(`case/${caseSA}/contacts`, {
      cache: true,
      cacheDuration: 10 * 60 * 1000 // 10 minutes for contacts
    });
  }

  // Contact methods
  async getContacts(params?: Record<string, string>) {
    return this.makeRequest('contacts', {
      params,
      cache: true,
      cacheDuration: 15 * 60 * 1000 // 15 minutes for contact lists
    });
  }

  async getContact(contactId: string | number) {
    return this.makeRequest(`contacts/${contactId}`, {
      cache: true,
      cacheDuration: 10 * 60 * 1000
    });
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
      this.getCaseNotes(caseSA),
      this.getCaseTasks(caseSA),
      this.getCaseContacts(caseSA)
    ];

    try {
      const [caseData, documents, notes, tasks, contacts] = await Promise.allSettled(promises);

      return {
        case: caseData.status === 'fulfilled' ? caseData.value : null,
        documents: documents.status === 'fulfilled' ? documents.value : [],
        notes: notes.status === 'fulfilled' ? notes.value : [],
        tasks: tasks.status === 'fulfilled' ? tasks.value : [],
        contacts: contacts.status === 'fulfilled' ? contacts.value : []
      };
    } catch (error) {
      console.error('Error fetching bulk case data:', error);
      throw error;
    }
  }

  // Write operations (no caching)
  async createCase(caseData: any) {
    const result = await this.makeRequest('case', {
      method: 'POST',
      body: caseData
    });

    // Clear relevant caches
    this.clearCache('case/CaseInfo');
    return result;
  }

  async updateCase(caseSA: string | number, caseData: any) {
    const result = await this.makeRequest(`case/CaseInfo?Casenumber=${caseSA}`, {
      method: 'PUT',
      body: caseData
    });

    // Clear case-specific cache
    this.clearCache(`case/CaseInfo?Casenumber=${caseSA}`);
    this.clearCache('case/CaseInfo');
    return result;
  }

  async deleteCase(caseId: string | number) {
    const result = await this.makeRequest(`case/${caseId}`, {
      method: 'DELETE'
    });

    // Clear all case-related caches
    this.clearCache();
    return result;
  }

  async createContact(contactData: any) {
    const result = await this.makeRequest('contacts', {
      method: 'POST',
      body: contactData
    });

    this.clearCache('contacts');
    return result;
  }

  async updateContact(contactId: string | number, contactData: any) {
    const result = await this.makeRequest(`contacts/${contactId}`, {
      method: 'PUT',
      body: contactData
    });

    this.clearCache(`contacts/${contactId}`);
    this.clearCache('contacts');
    return result;
  }

  async createNote(caseSA: string | number, noteData: any) {
    const result = await this.makeRequest(`case/${caseSA}/notes`, {
      method: 'POST',
      body: noteData
    });

    this.clearCache(`case/${caseSA}/notes`);
    return result;
  }

  async createTask(caseSA: string | number, taskData: any) {
    const result = await this.makeRequest(`case/${caseSA}/tasks`, {
      method: 'POST',
      body: taskData
    });

    this.clearCache(`case/${caseSA}/tasks`);
    return result;
  }

// Replace the existing getDocumentContent method in lib/smartadvocate/client.ts

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

  // For MSG files (Outlook messages), we'll handle them specially
  if (contentType.includes('application/vnd.ms-outlook') ||
      contentType.includes('application/octet-stream')) {

    // Get the first few bytes to check if it's an MSG file
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // MSG files start with specific OLE compound document signature
    const signature = Array.from(uint8Array.slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const isMSG = signature === 'd0cf11e0a1b11ae1'; // OLE compound document signature

    console.log(`Document ${documentId} signature: ${signature}, isMSG: ${isMSG}`);

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

    // If not MSG, handle as generic binary
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

// Add this method to the SmartAdvocateClient class in lib/smartadvocate/client.ts

async getDocumentContentBinary(documentId: string | number) {
  // Get the current user's session
  const { data: { session }, error } = await this.supabase.auth.getSession();

  if (error || !session) {
    throw new Error('User not authenticated');
  }

  const url = new URL(`/api/smartadvocate/case/document/${documentId}/content`, window.location.origin);

  console.log(`Making binary request to: ${url.toString()}`);

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

  // Get the content type and response as array buffer for binary handling
  const contentType = response.headers.get('content-type') || '';
  console.log(`Binary request content-type:`, contentType);

  // If it's JSON, parse it
  if (contentType.includes('application/json')) {
    return await response.json();
  }

  // Get content as array buffer for proper binary handling
  const arrayBuffer = await response.arrayBuffer();
  console.log(`Binary content length:`, arrayBuffer.byteLength);

  // Convert to Uint8Array for easier manipulation
  const uint8Array = new Uint8Array(arrayBuffer);

  // Check if it's a PDF by looking at the first few bytes
  const textDecoder = new TextDecoder('latin1'); // Use latin1 to preserve all byte values
  const firstBytes = textDecoder.decode(uint8Array.slice(0, 10));
  const isPDF = firstBytes.startsWith('%PDF-');

  console.log(`First 10 bytes:`, firstBytes);
  console.log(`Is PDF:`, isPDF);

  if (isPDF) {
    // Create a proper PDF blob
    const blob = new Blob([uint8Array], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);

    return {
      content: null,
      contentType: 'application/pdf',
      downloadUrl: downloadUrl,
      fileName: `document_${documentId}.pdf`,
      fileSize: arrayBuffer.byteLength,
      isPDFBinary: true
    };
  }

  // For images
  if (contentType.includes('image/')) {
    const blob = new Blob([uint8Array], { type: contentType });
    const downloadUrl = URL.createObjectURL(blob);

    return {
      content: null,
      contentType: contentType,
      downloadUrl: downloadUrl,
      fileName: `document_${documentId}.${contentType.split('/')[1]}`,
      fileSize: arrayBuffer.byteLength
    };
  }

  // For text content, convert to string
  const textContent = new TextDecoder('utf-8').decode(uint8Array);

  return {
    content: textContent,
    contentType: contentType || 'text/plain',
    fileName: `document_${documentId}.txt`,
    fileSize: arrayBuffer.byteLength
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

  // Search functionality
  async searchCases(query: string, filters?: Record<string, any>) {
    const params = {
      q: query,
      ...filters
    };

    return this.makeRequest('case/search', {
      params,
      cache: true,
      cacheDuration: 2 * 60 * 1000 // 2 minutes for search results
    });
  }

  async searchContacts(query: string, filters?: Record<string, any>) {
    const params = {
      q: query,
      ...filters
    };

    return this.makeRequest('contacts/search', {
      params,
      cache: true,
      cacheDuration: 5 * 60 * 1000
    });
  }

  // Analytics and reporting
  async getCaseAnalytics(caseSA: string | number) {
    return this.makeRequest(`case/${caseSA}/analytics`, {
      cache: true,
      cacheDuration: 60 * 60 * 1000 // 1 hour for analytics
    });
  }

  async getReports(reportType: string, params?: Record<string, string>) {
    return this.makeRequest(`reports/${reportType}`, {
      params,
      cache: true,
      cacheDuration: 30 * 60 * 1000 // 30 minutes for reports
    });
  }
}

export default new SmartAdvocateClient();
