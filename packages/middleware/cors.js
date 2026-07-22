// packages/middleware/cors.js
// CORS middleware configuration for Express
// Auto-detects allowed origins in production — no hardcoded domains
// Reads allowed methods and headers from config
// Handles preflight OPTIONS requests automatically
// Author: Theron

const corsLib = require('cors');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    cors: {
      autoDetect: true,
      fallbackOrigins: ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      credentials: true,
      maxAge: 86400,
    },
  };
}

/**
 * Determines if an origin is allowed based on the current environment.
 *
 * In development and test: uses the configured fallback origins list.
 * In production with autoDetect enabled:
 *   - Allows all *.vercel.app preview domains
 *   - Allows the VERCEL_URL environment variable if set
 *   - Allows requests with no origin (server-to-server, mobile apps, curl)
 *   - Falls back to the configured fallbackOrigins list
 *
 * This ensures zero hardcoded production domains — the system adapts
 * automatically when you point a new custom domain to Vercel.
 *
 * @param {string|null} origin - The request origin header value
 * @returns {boolean} Whether the origin is allowed
 */
function isOriginAllowed(origin) {
  // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
  if (!origin) {
    return true;
  }

  // Check explicit fallback origins from config
  const fallbackOrigins = config.cors.fallbackOrigins || [];
  const isInFallbackList = fallbackOrigins.some((allowed) => {
    if (allowed === '*') return true;
    return origin === allowed;
  });

  if (isInFallbackList) {
    return true;
  }

  // In production with autoDetect, allow Vercel preview domains dynamically
  if (config.cors.autoDetect && process.env.NODE_ENV === 'production') {
    // Allow any *.vercel.app subdomain (Vercel preview deploys)
    if (origin.endsWith('.vercel.app')) {
      return true;
    }

    // Allow the explicitly configured Vercel URL
    if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) {
      return true;
    }

    // Allow the production URL if configured via env
    if (process.env.NEXT_PUBLIC_APP_URL && origin === process.env.NEXT_PUBLIC_APP_URL) {
      return true;
    }
  }

  // In development with autoDetect, allow localhost variations
  if (config.cors.autoDetect && process.env.NODE_ENV === 'development') {
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Creates and returns a configured CORS middleware instance.
 * Uses the cors config for origin validation, allowed methods,
 * exposed headers, and credentials support.
 *
 * Origins are validated dynamically — no hardcoded production domains.
 * The middleware automatically responds to preflight OPTIONS requests.
 *
 * @returns {Function} Configured CORS middleware
 */
function createCorsMiddleware() {
  const corsOptions = {
    origin: function (origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    methods: config.cors.methods || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: config.cors.allowedHeaders || ['Content-Type', 'Authorization'],
    exposedHeaders: config.cors.exposedHeaders || [],
    credentials: config.cors.credentials !== undefined ? config.cors.credentials : true,
    maxAge: config.cors.maxAge || 86400,
  };

  return corsLib(corsOptions);
}

module.exports = createCorsMiddleware;