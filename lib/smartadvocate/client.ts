// lib/smartadvocate/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

class SmartAdvocateClient {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  async makeRequest(endpoint: string, options: RequestOptions = {}) {
    // Get the current user's session
    const { data: { session }, error } = await this.supabase.auth.getSession();

    if (error || !session) {
      throw new Error('User not authenticated');
    }

    // Build URL with query parameters
    const url = new URL(`/api/smartadvocate/${endpoint}`, window.location.origin);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Make request to your API route
    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }

  // Example methods for common SmartAdvocate operations
  async getCases(params?: Record<string, string>) {
    return this.makeRequest('cases', { params });
  }

  async getCase(caseSA: string | number) {
    return this.makeRequest(`case/CaseInfo?Casenumber=${caseSA}`);
  }

  async createCase(caseData: any) {
    return this.makeRequest('cases', {
      method: 'POST',
      body: caseData
    });
  }

  async updateCase(caseSA: string | number, caseData: any) {
    return this.makeRequest(`case/CaseInfo?Casenumber=${caseSA}`, {
      method: 'PUT',
      body: caseData
    });
  }

  async deleteCase(caseId: string | number) {
    return this.makeRequest(`cases/${caseId}`, {
      method: 'DELETE'
    });
  }

  // Add more SmartAdvocate-specific methods as needed
  async getContacts(params?: Record<string, string>) {
    return this.makeRequest('contacts', { params });
  }

  async createContact(contactData: any) {
    return this.makeRequest('contacts', {
      method: 'POST',
      body: contactData
    });
  }

  // Generic method for any SmartAdvocate endpoint
  async request(endpoint: string, options?: RequestOptions) {
    return this.makeRequest(endpoint, options);
  }
}

export default new SmartAdvocateClient();
