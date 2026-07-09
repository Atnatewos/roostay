// packages/utils/redis.js
// Upstash Redis client for distributed serverless rate limiting and caching
// Falls back gracefully if environment variables are not configured
const logger = require('./logger');

let redisClient = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const { Redis } = require('@upstash/redis');
    redisClient = new Redis({ url, token });
    logger.info('Upstash Redis client initialized successfully.');
  } else {
    logger.warn('Upstash Redis credentials not found. Rate limiting will use in-memory fallback.');
  }
} catch (error) {
  logger.error('Failed to initialize Upstash Redis client.', { error: error.message });
}

module.exports = redisClient;