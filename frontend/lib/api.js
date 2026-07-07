class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getAccessToken() {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('roostay_access_token'); } catch { return null; }
}

function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('roostay_refresh_token'); } catch { return null; }
}

function storeTokens(accessToken, refreshToken) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('roostay_access_token', accessToken);
    if (refreshToken) localStorage.setItem('roostay_refresh_token', refreshToken);
  } catch (e) { console.error('Failed to store tokens:', e); }
}

function clearTokens() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('roostay_access_token');
    localStorage.removeItem('roostay_refresh_token');
    localStorage.removeItem('roostay_user');
  } catch (e) { console.error('Failed to clear tokens:', e); }
}

function storeUser(user) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem('roostay_user', JSON.stringify(user)); } catch {}
}

function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { const u = localStorage.getItem('roostay_user'); return u ? JSON.parse(u) : null; } catch { return null; }
}

async function refreshAccessToken() {
  const rt = getRefreshToken();
  if (!rt) { clearTokens(); return null; }
  try {
    const res = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    storeTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
    return data.data.tokens.accessToken;
  } catch { clearTokens(); return null; }
}

async function api(endpoint, options = {}) {
  const { method = 'GET', body, headers = {}, auth = true } = options;
  const url = `/api${endpoint}`;
  const requestHeaders = { 'Content-Type': 'application/json', ...headers };
  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  const fetchOptions = { method, headers: requestHeaders };
  if (body && method !== 'GET') fetchOptions.body = JSON.stringify(body);
  let response = await fetch(url, fetchOptions);
  if (response.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      requestHeaders['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...fetchOptions, headers: requestHeaders });
    }
  }
  let data;
  try { data = await response.json(); } catch { data = { message: 'Invalid response' }; }
  if (!response.ok) throw new ApiError(data?.error?.message || data?.message || 'Request failed', response.status, data);
  return data;
}

const apiClient = {
  get: (e, o) => api(e, { ...o, method: 'GET' }),
  post: (e, b, o) => api(e, { ...o, method: 'POST', body: b }),
  put: (e, b, o) => api(e, { ...o, method: 'PUT', body: b }),
  patch: (e, b, o) => api(e, { ...o, method: 'PATCH', body: b }),
  delete: (e, o) => api(e, { ...o, method: 'DELETE' }),
};

export { api, apiClient, ApiError, getAccessToken, storeTokens, clearTokens, storeUser, getStoredUser };
