import { useAuthStore } from '@/stores/auth.store';

const API_BASE = '/api';

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const { accessToken, user } = data.data;
    useAuthStore.getState().setAuth(user, accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const store = useAuthStore.getState();
  let token = store.accessToken;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
    } else {
      useAuthStore.getState().logout();
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export function apiGet<T>(path: string) {
  return apiFetch<T>(path);
}

export function apiPost<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
}

export function apiPut<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, {
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
}

export function apiDelete<T>(path: string) {
  return apiFetch<T>(path, { method: 'DELETE' });
}
