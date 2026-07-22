// frontend/lib/api.js
// Centralized API client for frontend-backend communication
// Uses httpOnly cookies for authentication (credentials: 'include')
// All URLs are built dynamically via buildApiUrl() — zero hardcoded domains
// Author: Theron

import { buildApiUrl } from './url';

/**
 * Custom error class for API responses.
 * Extends the native Error with HTTP status and server response data.
 */
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Token refresh queue management
// Prevents multiple simultaneous refresh attempts when several requests fail at once
let isRefreshing = false;
let failedQueue = [];

/**
 * Processes the queue of failed requests after a token refresh attempt.
 * If the refresh succeeded (no error), all queued requests are retried.
 * If the refresh failed, all queued requests are rejected.
 *
 * @param {Error|null} error - Null if refresh succeeded, Error if it failed
 */
function processQueue(error) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
}

/**
 * Core API request function.
 * Automatically includes httpOnly cookies for authentication via credentials: 'include'.
 * Handles 401 errors by attempting to refresh the token cookie silently.
 * All URLs are built dynamically — the domain is detected at runtime, never hardcoded.
 *
 * @param {string} endpoint          - API endpoint path (e.g., '/auth/me')
 * @param {Object} [options]         - Request configuration
 * @param {string} [options.method]  - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {Object} [options.body]    - Request body (for POST/PUT/PATCH)
 * @param {Object} [options.headers] - Additional request headers
 * @param {boolean} [options.auth]   - Whether to attempt token refresh on 401 (default: true)
 * @returns {Promise<Object>} Parsed JSON response from the API
 * @throws {ApiError} When the request fails or returns a non-OK status
 */
async function api(endpoint, options = {}) {
  const { method = 'GET', body, headers = {}, auth = true } = options;

  // Build the full API URL dynamically — detects domain at runtime
  const url = buildApiUrl(endpoint);

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders = { ...headers };

  // Set default Content-Type for non-FormData requests
  if (!isFormData && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions = {
    method,
    headers: requestHeaders,
    credentials: 'include', // Sends httpOnly cookies automatically with every request
  };

  // Attach body for write operations
  if (body && method !== 'GET') {
    fetchOptions.body = isFormData ? body : JSON.stringify(body);
  }

  let response = await fetch(url, fetchOptions);

  // =========================================================================
  // SILENT TOKEN REFRESH
  // When the access token expires (401), attempt to refresh it automatically
  // using the httpOnly refresh cookie. Queues concurrent requests to prevent
  // multiple simultaneous refresh attempts.
  // =========================================================================
  if (response.status === 401 && auth) {
    if (isRefreshing) {
      // Another request is already refreshing — queue this one
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => fetch(url, fetchOptions));
    }

    isRefreshing = true;

    try {
      // The refresh endpoint reads the httpOnly refresh cookie set by the server
      const refreshRes = await fetch(buildApiUrl('/auth/refresh-token'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!refreshRes.ok) {
        throw new Error('Session expired');
      }

      // Refresh succeeded — retry all queued requests
      processQueue(null);

      // Retry the original request with the new access cookie
      response = await fetch(url, fetchOptions);
    } catch (err) {
      // Refresh failed — reject all queued requests and redirect to login
      processQueue(err);

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      throw new ApiError('Session expired. Please log in again.', 401, {});
    } finally {
      isRefreshing = false;
    }
  }

  // Parse the response body as JSON
  let data;
  try {
    data = await response.json();
  } catch {
    data = { message: 'Invalid response' };
  }

  // Throw a structured error for non-OK responses
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || data?.message || 'Request failed',
      response.status,
      data
    );
  }

  return data;
}

/**
 * Convenience methods for common HTTP verbs.
 * Each method wraps the core api() function with the appropriate HTTP method.
 */
const apiClient = {
  get: (endpoint, options) => api(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => api(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => api(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => api(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => api(endpoint, { ...options, method: 'DELETE' }),
};

export { api, apiClient, ApiError };