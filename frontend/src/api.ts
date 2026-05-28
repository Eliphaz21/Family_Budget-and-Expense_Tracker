export type ApiRequestOptions = RequestInit & {
  token?: string | null;
};

async function readResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers || {});

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...rest,
    headers: requestHeaders,
    body,
  });

  const data = await readResponseBody(response);

  if (!response.ok) {
    const errorMessage = typeof data === 'string' ? data : data?.error || response.statusText || 'Request failed';
    throw new Error(errorMessage);
  }

  return data as T;
}

export function getStoredAuthToken() {
  return localStorage.getItem('auth_token');
}

export function storeAuthToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('auth_token');
}
