// frontend/lib/url.js
// Automatic domain detection — never hardcode a URL again
// Works in browser, SSR, API routes, and Vercel preview deploys
// Author: Theron

/**
 * Returns the current application base URL.
 * Automatically detects the domain from the runtime environment.
 * No configuration needed — works on localhost, Vercel previews, and custom domains.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL env var (explicit override for unusual setups)
 * 2. Browser window.location.origin (client-side)
 * 3. Vercel VERCEL_URL env var (server-side preview deploys)
 * 4. Fallback to localhost:3000
 *
 * @returns {string} The detected base URL (e.g., "https://roostay.com")
 */
export function getBaseUrl() {
  // Explicit override from environment (rarely needed)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }

  // Client-side: browser tells us the domain
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }

  // Server-side on Vercel: system env var with the deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local development fallback
  return 'http://localhost:3000';
}

/**
 * Builds a full absolute URL from a relative path.
 *
 * @param {string} path - Relative path starting with "/" (e.g., "/listings")
 * @returns {string} Full absolute URL (e.g., "https://roostay.com/listings")
 */
export function buildUrl(path) {
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Builds an API URL from a relative endpoint path.
 *
 * @param {string} endpoint - API endpoint (e.g., "/auth/me" or "auth/me")
 * @returns {string} Full API URL
 */
export function buildApiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return buildUrl(`/api${cleanEndpoint}`);
}