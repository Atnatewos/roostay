// packages/middleware/cors.js
// CORS middleware configuration for Express
// Reads allowed origins, methods, and headers from config
// Handles preflight OPTIONS requests automatically

const corsLib = require('cors');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      credentials: true,
      maxAge: 86400,
    },
  };
}

/**
 * Creates and returns a configured CORS middleware instance.
 * Uses the cors config for origin validation, allowed methods,
 * exposed headers, and credentials support.
 *
 * Origins are validated against the configured allowlist.
 * The middleware automatically responds to preflight OPTIONS requests.
 *
 * @returns {Function} Configured CORS middleware
 */
function createCorsMiddleware() {
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Check if the origin is in the allowed list
      const allowedOrigins = config.cors.origin || [];
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*') return true;
        return origin === allowed;
      });

      if (isAllowed) {
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