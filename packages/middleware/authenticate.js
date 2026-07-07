// packages/middleware/authenticate.js
// JWT authentication middleware for Express
// Extracts and verifies the access token from the Authorization header
// Attaches the decoded user payload to req.user for downstream handlers

const { verifyAccessToken, extractTokenFromHeader } = require('../utils/token');
const { AuthError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Authentication middleware that verifies JWT access tokens.
 * Extracts the token from the Authorization header using the configured token type.
 * On success, attaches the decoded payload { sub, email, role } to req.user.
 * On failure, passes an AuthError to the error handler.
 *
 * Usage:
 *   router.get('/profile', authenticate, profileController.getProfile);
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthError('Authentication required. Please provide a valid access token.');
    }

    const decoded = verifyAccessToken(token);

    // Attach user information to the request object
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    logger.debug('User authenticated', {
      userId: decoded.sub,
      role: decoded.role,
      path: req.originalUrl,
    });

    next();
  } catch (error) {
    // Log authentication failures for security monitoring
    logger.warn('Authentication failed', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      reason: error.message,
    });

    next(error);
  }
}

/**
 * Optional authentication middleware.
 * Verifies the token if present but does not fail if no token is provided.
 * Useful for routes that behave differently for authenticated vs anonymous users.
 * On success, attaches req.user. On missing/invalid token, continues without error.
 *
 * Usage:
 *   router.get('/listings', optionalAuth, listingController.getListings);
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
    }
  } catch (error) {
    // Silently continue without authentication
    logger.debug('Optional authentication skipped', {
      path: req.originalUrl,
      reason: error.message,
    });
  }

  next();
}

module.exports = {
  authenticate,
  optionalAuth,
};