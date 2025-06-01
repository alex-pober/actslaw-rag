// lib/smartadvocate/token-manager.ts
interface SmartAdvocateAuthResponse {
  username: string;
  userID: number;
  token: string;
}

interface RequestConfig {
  method?: string;
  url: string;
  data?: any;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

class SmartAdvocateTokenManager {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshPromise: Promise<string> | null = null;

  private readonly username: string;
  private readonly password: string;

  constructor() {
    this.username = process.env.SMARTADVOCATE_USERNAME || '';
    this.password = process.env.SMARTADVOCATE_PASSWORD || '';

    if (!this.username || !this.password) {
      throw new Error('SmartAdvocate credentials not configured');
    }
  }

  private async authenticate(): Promise<string> {
    try {
      const response = await fetch('https://sa.actslaw.com/CaseSyncAPI/Users/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Username: this.username,
          Password: this.password
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const authData: SmartAdvocateAuthResponse = await response.json();
      this.token = authData.token;

      // Decode JWT to get expiry (assuming it's a standard JWT)
      try {
        const payload = JSON.parse(Buffer.from(this.token.split('.')[1], 'base64').toString());
        this.tokenExpiry = new Date(payload.exp * 1000);
      } catch (e) {
        // If we can't decode the token, set expiry to 1 hour from now
        this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
      }

      console.log('SmartAdvocate token refreshed, expires at:', this.tokenExpiry);
      return this.token;
    } catch (error) {
      console.error('Failed to authenticate with SmartAdvocate:', error);
      throw error;
    }
  }

  async getValidToken(): Promise<string> {
    // If no token or token expired, authenticate
    if (!this.token || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
      // Prevent multiple simultaneous authentication requests
      if (!this.refreshPromise) {
        this.refreshPromise = this.authenticate();
      }
      await this.refreshPromise;
      this.refreshPromise = null;
    }

    return this.token!;
  }

  async makeAuthenticatedRequest(config: RequestConfig) {
    const token = await this.getValidToken();

    // Build URL with query parameters
    const url = new URL(config.url);
    if (config.params) {
      Object.entries(config.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    console.log(`Making SmartAdvocate API request to: ${url.toString()}`);
    console.log(`Method: ${config.method || 'GET'}`);

    const response = await fetch(url.toString(), {
      method: config.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...config.headers
      },
      body: config.data ? JSON.stringify(config.data) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      const error = new Error(`SmartAdvocate API Error: ${response.status} ${response.statusText}`);
      (error as any).response = {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      };
      throw error;
    }

    return {
      data: await response.json(),
      status: response.status,
      statusText: response.statusText
    };
  }
}

// Singleton instance
const tokenManager = new SmartAdvocateTokenManager();

export default tokenManager;
