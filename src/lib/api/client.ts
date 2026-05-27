const BACKEND_URL = 'http://localhost:8080';

export interface ApiError {
  error: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('fatturehub_access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('fatturehub_refresh_token');
  }

  private setTokens(access: string, refresh: string) {
    localStorage.setItem('fatturehub_access_token', access);
    localStorage.setItem('fatturehub_refresh_token', refresh);
  }

  clearTokens() {
    localStorage.removeItem('fatturehub_access_token');
    localStorage.removeItem('fatturehub_refresh_token');
    localStorage.removeItem('fatturehub_user');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        res = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers,
        });
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        this.clearTokens();
        return false;
      }

      const data = await res.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  async login(email: string, password: string) {
    const data: any = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    localStorage.setItem('fatturehub_user', JSON.stringify(data.user));
    return data;
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {}
    this.clearTokens();
  }

  async getMe(): Promise<any> {
    return this.request('/api/auth/me');
  }

  async getCredits(): Promise<any> {
    return this.request('/api/credits');
  }

  async getPlans(): Promise<any> {
    return this.request('/api/plans');
  }

  async createCheckout(planId?: string, topupId?: string): Promise<{ url: string }> {
    return this.request('/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, topup_id: topupId }),
    });
  }

  async getSubscription(): Promise<any> {
    return this.request('/api/stripe/subscription');
  }

  async getBillingPortal(): Promise<{ url: string }> {
    return this.request('/api/stripe/portal');
  }

  async getProjects(): Promise<any[]> {
    return this.request('/api/projects');
  }

  async createProject(name: string, data: any): Promise<any> {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, data }),
    });
  }

  async updateProject(id: string, name: string, data: any): Promise<any> {
    return this.request(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, data }),
    });
  }

  async deleteProject(id: string): Promise<any> {
    return this.request(`/api/projects/${id}`, { method: 'DELETE' });
  }

  async getFatture(projectId?: string): Promise<any[]> {
    const query = projectId ? `?project_id=${projectId}` : '';
    return this.request(`/api/fatture${query}`);
  }

  async syncFatture(fatture: any[], projectId?: string): Promise<any[]> {
    return this.request('/api/fatture/batch', {
      method: 'POST',
      body: JSON.stringify({
        fatture: fatture.map((f) => ({
          data: f,
          project_id: projectId,
        })),
      }),
    });
  }

  async chatWithAi(messages: any[], system?: string): Promise<any> {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, system }),
    });
  }
}

export const api = new ApiClient();
