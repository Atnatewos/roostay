// packages/utils/errorHandler.js
// Express error handling middleware
// Catches all errors thrown in route handlers and returns structured JSON responses
// Handles both operational errors and unexpected programming errors
// Emits error events for observability via events.errorOccurred()
// Author: Theron

const logger = require('./logger');
const events = require('./events');
const { AppError } = require('./errors');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = { app: { debug: process.env.NODE_ENV !== 'production' } };
}

/**
 * Express error handling middleware.
 * Must be registered AFTER all routes in the Express app.
 *
 * @param {Error}    err  - The error object
 * @param {Object}   req  - Express request object
 * @param {Object}   res  - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorHandler(err, req, res, next) {
  // Log the error with full context
  logger.error('Unhandled error in request', {
    method: req.method,
    path: req.originalUrl,
    error: err.message,
    stack: config.app.debug ? err.stack : undefined,
    userId: req.user ? req.user.id : undefined,
  });

  // Emit error event for observability pipeline
  events.errorOccurred(err, {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    userRole: req.user?.role,
    ip: req.ip,
  });

  // Handle known operational errors
  if (err instanceof AppError) {
    const response = {
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
      },
    };

    if (err.details && Object.keys(err.details).length > 0) {
      response.error.details = err.details;
    }

    if (err.retryAfter) {
      res.set('Retry-After', String(err.retryAfter));
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle Joi validation errors
  if (err.isJoi) {
    const details = {};
    if (err.details) {
      err.details.forEach((detail) => {
        const key = detail.path.join('.');
        details[key] = detail.message;
      });
    }

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
      },
    });
  }

  // Handle Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Uploaded file exceeds the maximum allowed size',
      },
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_FIELD',
        message: 'Unexpected file field in upload',
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'The provided token is invalid',
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please log in again.',
      },
    });
  }

  // Handle PostgreSQL errors
  if (err.code && err.code.startsWith('23')) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DATABASE_CONSTRAINT_ERROR',
        message: 'A database constraint was violated',
      },
    });
  }

  // Handle unexpected errors
  const isProduction = !config.app.debug;

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'An unexpected error occurred. Please try again later.'
        : err.message,
    },
  });
}

/**
 * 404 handler middleware for routes that don't match any route.
 *
 * @param {Object}   req  - Express request object
 * @param {Object}   res  - Express response object
 * @param {Function} next - Express next middleware function
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};