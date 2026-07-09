// frontend/lib/api.js
// Centralized API client for frontend-backend communication
// Uses httpOnly cookies for authentication (credentials: 'include')
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

/**
 * Core API request function.
 * Automatically includes httpOnly cookies for authentication.
 * Handles 401 errors by attempting to refresh the token cookie.
 */
async function api(endpoint, options = {}) {
  const { method = 'GET', body, headers = {}, auth = true } = options;
  const url = `/api${endpoint}`;
  
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders = { ...headers };
  
  if (!isFormData && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions = {
    method,
    headers: requestHeaders,
    credentials: 'include', // CRITICAL: Sends httpOnly cookies automatically
  };

  if (body && method !== 'GET') {
    fetchOptions.body = isFormData ? body : JSON.stringify(body);
  }

  let response = await fetch(url, fetchOptions);

  // Handle token expiration (401) and automatic cookie refresh
  if (response.status === 401 && auth) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => fetch(url, fetchOptions));
    }

    isRefreshing = true;

    try {
      // Call refresh endpoint. The backend will read the refresh cookie 
      // and set a new access cookie automatically.
      const refreshRes = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!refreshRes.ok) {
        throw new Error('Session expired');
      }

      processQueue(null);
      // Retry the original request with the new access cookie
      response = await fetch(url, fetchOptions);
    } catch (err) {
      processQueue(err);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError('Session expired. Please log in again.', 401, {});
    } finally {
      isRefreshing = false;
    }
  }

  let data;
  try { data = await response.json(); } catch { data = { message: 'Invalid response' }; }
  
  if (!response.ok) {
    throw new ApiError(data?.error?.message || data?.message || 'Request failed', response.status, data);
  }
  
  return data;
}

const apiClient = {
  get: (e, o) => api(e, { ...o, method: 'GET' }),
  post: (e, b, o) => api(e, { ...o, method: 'POST', body: b }),
  put: (e, b, o) => api(e, { ...o, method: 'PUT', body: b }),
  patch: (e, b, o) => api(e, { ...o, method: 'PATCH', body: b }),
  delete: (e, o) => api(e, { ...o, method: 'DELETE' }),
};

export { api, apiClient, ApiError };