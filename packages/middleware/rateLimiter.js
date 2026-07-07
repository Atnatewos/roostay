// packages/middleware/rateLimiter.js
// Rate limiting middleware for Express
// Protects against brute force attacks and API abuse
// Configurable limits per route category from rateLimit config

const { RateLimitError } = require('../utils/errors');
const logger = require('../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    rateLimit: {
      global: { windowMs: 900000, max: 100 },
      auth: { windowMs: 900000, max: 20 },
      listing: { windowMs: 900000, max: 50 },
      booking: { windowMs: 60000, max: 10 },
      payment: { windowMs: 60000, max: 5 },
      upload: { windowMs: 60000, max: 15 },
    },
  };
}

/**
 * In-memory store for rate limit tracking.
 * For production, replace with Redis or a distributed store.
 * Tracks request counts per IP within a sliding window.
 */
const requestStore = new Map();

/**
 * Cleans up expired rate limit entries periodically.
 * Prevents memory leaks from accumulating stale entries.
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of requestStore.entries()) {
    if (now > entry.resetTime) {
      requestStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Rate limiting middleware factory.
 * Creates a middleware that limits requests per IP address within a time window.
 *
 * Usage:
 *   router.use(rateLimiter());                        // Global limits
 *   router.post('/login', rateLimiter('auth'), ...);   // Auth limits
 *   router.post('/listings', rateLimiter('listing'), ...); // Listing limits
 *
 * @param {string} [type='global'] - The rate limit category from config
 * @returns {Function} Express middleware function
 */
function rateLimiter(type = 'global') {
  const limitConfig = config.rateLimit[type] || config.rateLimit.global;
  const windowMs = limitConfig.windowMs || 900000; // 15 minutes default
  const maxRequests = limitConfig.max || 100;
  const message = limitConfig.message || 'Too many requests. Please try again later.';

  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const key = `${type}:${identifier}`;

    let entry = requestStore.get(key);

    // Check if the window has expired and reset if needed
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Increment the request count
    entry.count += 1;
    requestStore.set(key, entry);

    // Calculate remaining requests and reset time
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        type,
        identifier,
        count: entry.count,
        limit: maxRequests,
        path: req.originalUrl,
      });

      const error = new RateLimitError(message, resetSeconds);
      return next(error);
    }

    next();
  };
}

module.exports = rateLimiter;