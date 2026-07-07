// packages/utils/errors.js
// Custom error classes for ROOSTAY
// Provides structured error handling with HTTP status codes and error codes
// Enables consistent error responses across the entire API

/**
 * Base application error class.
 * All custom errors extend this to maintain consistent error structure.
 * Marked as operational to distinguish from programming errors.
 *
 * @extends Error
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [errorCode='APP_ERROR'] - Machine-readable error code
   */
  constructor(message, statusCode = 500, errorCode = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - thrown when request data fails validation.
 * Typically returns HTTP 400 Bad Request.
 *
 * @extends AppError
 */
class ValidationError extends AppError {
  /**
   * @param {string} message - Validation failure description
   * @param {Object} [details={}] - Field-level validation errors
   */
  constructor(message = 'Validation failed', details = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Authentication error - thrown when user authentication fails.
 * Typically returns HTTP 401 Unauthorized.
 *
 * @extends AppError
 */
class AuthError extends AppError {
  /**
   * @param {string} message - Authentication failure description
   */
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

/**
 * Forbidden error - thrown when an authenticated user lacks permissions.
 * Typically returns HTTP 403 Forbidden.
 *
 * @extends AppError
 */
class ForbiddenError extends AppError {
  /**
   * @param {string} message - Permission failure description
   */
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN_ERROR');
    this.name = 'ForbiddenError';
  }
}

/**
 * Not found error - thrown when a requested resource does not exist.
 * Typically returns HTTP 404 Not Found.
 *
 * @extends AppError
 */
class NotFoundError extends AppError {
  /**
   * @param {string} message - Resource description that was not found
   */
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error - thrown when a request conflicts with existing data.
 * Typically returns HTTP 409 Conflict.
 *
 * @extends AppError
 */
class ConflictError extends AppError {
  /**
   * @param {string} message - Conflict description
   */
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error - thrown when a client exceeds rate limits.
 * Typically returns HTTP 429 Too Many Requests.
 *
 * @extends AppError
 */
class RateLimitError extends AppError {
  /**
   * @param {string} message - Rate limit description
   * @param {number} [retryAfter=60] - Seconds until the client can retry
   */
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Payment error - thrown when payment processing fails.
 * Typically returns HTTP 402 Payment Required.
 *
 * @extends AppError
 */
class PaymentError extends AppError {
  /**
   * @param {string} message - Payment failure description
   * @param {Object} [details={}] - Payment-specific error details
   */
  constructor(message = 'Payment failed', details = {}) {
    super(message, 402, 'PAYMENT_ERROR');
    this.name = 'PaymentError';
    this.details = details;
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  PaymentError,
};