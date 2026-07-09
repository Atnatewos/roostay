// packages/middleware/rateLimiter.js
// Distributed rate limiting middleware using Upstash Redis
// Falls back to in-memory storage if Redis is not configured (for local dev)
const redisClient = require('../utils/redis');
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
    },
  };
}

// In-memory fallback store for local development
const memoryStore = new Map();

function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) memoryStore.delete(key);
  }
}
setInterval(cleanupMemoryStore, 5 * 60 * 1000);

/**
 * Rate limiting middleware factory.
 * Uses Redis for distributed serverless environments, falls back to memory.
 * 
 * @param {string} [type='global'] - The rate limit category from config
 * @returns {Function} Express middleware function
 */
function rateLimiter(type = 'global') {
  const limitConfig = config.rateLimit[type] || config.rateLimit.global;
  const windowMs = limitConfig.windowMs || 900000;
  const maxRequests = limitConfig.max || 100;
  const message = limitConfig.message || 'Too many requests. Please try again later.';
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const key = `roostay:ratelimit:${type}:${identifier}`;

    try {
      if (redisClient) {
        // ======================================================================
        // DISTRIBUTED REDIS RATE LIMITING
        // ======================================================================
        const currentCount = await redisClient.incr(key);
        
        // Set expiry only on the first request of the window
        if (currentCount === 1) {
          await redisClient.expire(key, windowSeconds);
        }

        const remaining = Math.max(0, maxRequests - currentCount);
        const resetSeconds = await redisClient.ttl(key);

        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + resetSeconds * 1000) / 1000));

        if (currentCount > maxRequests) {
          logger.warn('Redis rate limit exceeded', { type, identifier, count: currentCount });
          return next(new RateLimitError(message, resetSeconds));
        }
        return next();
      } else {
        // ======================================================================
        // IN-MEMORY FALLBACK RATE LIMITING
        // ======================================================================
        const now = Date.now();
        let entry = memoryStore.get(key);

        if (!entry || now > entry.resetTime) {
          entry = { count: 0, resetTime: now + windowMs };
        }

        entry.count += 1;
        memoryStore.set(key, entry);

        const remaining = Math.max(0, maxRequests - entry.count);
        const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

        if (entry.count > maxRequests) {
          logger.warn('Memory rate limit exceeded', { type, identifier, count: entry.count });
          return next(new RateLimitError(message, resetSeconds));
        }
        return next();
      }
    } catch (error) {
      // Fail open to prevent blocking users if Redis goes down
      logger.error('Rate limiter failed, allowing request to pass.', { error: error.message });
      next();
    }
  };
}

module.exports = rateLimiter;