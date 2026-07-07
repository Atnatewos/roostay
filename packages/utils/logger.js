// packages/utils/logger.js
// Structured logging utility for ROOSTAY
// Provides leveled logging (debug, info, warn, error) with timestamp and metadata
// Suppresses debug logs in production automatically

let config;
try {
  config = require('@roostay/config');
} catch {
  config = { app: { debug: process.env.NODE_ENV !== 'production', logLevel: process.env.LOG_LEVEL || 'info' } };
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[config.app.logLevel] || LOG_LEVELS.info;

/**
 * Formats a log message with timestamp, level, and optional metadata.
 * Sanitizes sensitive fields (passwords, tokens, secrets) from metadata.
 *
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} message - The log message
 * @param {Object} [meta={}] - Additional metadata to include
 * @returns {string} Formatted log string
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitizeMetadata(meta);
  const metaStr = Object.keys(sanitizedMeta).length > 0 ? ` ${JSON.stringify(sanitizedMeta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

/**
 * Removes sensitive information from log metadata.
 * Redacts password, token, secret, authorization, and cookie fields.
 *
 * @param {Object} meta - Raw metadata object
 * @returns {Object} Sanitized metadata object
 */
function sanitizeMetadata(meta) {
  const sensitiveKeys = [
    'password', 'passwordHash', 'password_hash',
    'token', 'accessToken', 'refreshToken',
    'secret', 'apiKey', 'api_key',
    'authorization', 'cookie',
    'creditCard', 'credit_card',
  ];

  const sanitized = {};

  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

    if (isSensitive && typeof value === 'string') {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Logger instance with methods for each log level.
 * Usage: logger.info('User logged in', { userId: '123' });
 * Usage: logger.error('Payment failed', { error: err.message, bookingId: '456' });
 */
const logger = {
  /**
   * Debug level - detailed information for development troubleshooting.
   * Suppressed in production.
   *
   * @param {string} message - Log message
   * @param {Object} [meta] - Additional metadata
   */
  debug(message, meta) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatLog('DEBUG', message, meta));
    }
  },

  /**
   * Info level - general operational events and milestones.
   *
   * @param {string} message - Log message
   * @param {Object} [meta] - Additional metadata
   */
  info(message, meta) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info(formatLog('INFO', message, meta));
    }
  },

  /**
   * Warn level - potentially harmful situations that should be monitored.
   *
   * @param {string} message - Log message
   * @param {Object} [meta] - Additional metadata
   */
  warn(message, meta) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatLog('WARN', message, meta));
    }
  },

  /**
   * Error level - failures that require immediate attention.
   * Includes stack trace in the metadata.
   *
   * @param {string} message - Log message
   * @param {Error|Object} [error] - Error object or metadata
   */
  error(message, error) {
    if (currentLevel <= LOG_LEVELS.error) {
      const meta = {};

      if (error instanceof Error) {
        meta.error = error.message;
        meta.stack = error.stack;
      } else if (error) {
        Object.assign(meta, error);
      }

      console.error(formatLog('ERROR', message, meta));
    }
  },
};

module.exports = logger;