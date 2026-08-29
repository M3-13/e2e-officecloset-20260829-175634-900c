const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const TOKEN_KEY = 'office_closet_token';
const EMAIL_KEY = 'office_closet_email';

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getEmail(): string | null {
  return window.localStorage.getItem(EMAIL_KEY);
}

export function persistAuth(token: string, email: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(EMAIL_KEY, email);
}

export function clearAuth(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(EMAIL_KEY);
}

export function redirectToLogin(): void {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    redirectToLogin();
  }

  if (!res.ok) {
    let detail = 'Anfrage fehlgeschlagen';
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') {
        detail = body.detail;
      }
    } catch {
      // Non-JSON error body: keep the generic message.
    }
    throw new Error(detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
