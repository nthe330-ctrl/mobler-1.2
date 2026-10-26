/**
 * Minimal HTTP client shared by the customer app and the shop app.
 * Each app creates its own instance with its own token storage key, so being
 * signed in to one app never signs you in to the other.
 */

export class ApiError extends Error {
  status: number;
  code?: string;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.code = data?.code;
    this.data = data;
  }
}

export function apiBaseUrl(): string {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_URL || '').replace(/\/$/, '');
}

export class HttpClient {
  private token: string | null = null;
  private onUnauthorized?: () => void;

  constructor(private readonly tokenKey: string) {
    try {
      this.token = localStorage.getItem(tokenKey);
    } catch {
      // storage unavailable (private mode) — keep token in memory only
    }
  }

  setUnauthorizedHandler(handler: () => void) {
    this.onUnauthorized = handler;
  }

  setToken(token: string | null) {
    this.token = token;
    try {
      if (token) localStorage.setItem(this.tokenKey, token);
      else localStorage.removeItem(this.tokenKey);
    } catch {
      // ignore
    }
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    let res: Response;
    try {
      res = await fetch(`${apiBaseUrl()}/api${endpoint}`, { ...options, headers });
    } catch {
      // Never reached the server, so there is no server code to carry — this one is ours,
      // and it is in the same vocabulary as the rest so one translator handles both.
      throw new ApiError('Không kết nối được máy chủ. Kiểm tra mạng và thử lại.', 0, { code: 'NETWORK_UNREACHABLE' });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && this.token) {
        this.setToken(null);
        this.onUnauthorized?.();
      }
      // A route that answers without a code still gets one, so the client always has
      // something to look up; `data.error` remains the fallback text.
      throw new ApiError(data.error || `Yêu cầu thất bại (${res.status})`, res.status, {
        code: 'REQUEST_FAILED',
        ...data
      });
    }
    return data as T;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }
  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
  }
  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) });
  }
}
