// packages/middleware/authenticate.js
// JWT authentication middleware
// Reads access token from httpOnly cookies first, then falls back to Authorization header
const { verifyAccessToken, extractTokenFromHeader } = require('../utils/token');
const { AuthError } = require('../utils/errors');
const logger = require('../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = { auth: { cookies: { accessName: 'roostay_access_token' }, tokenType: 'Bearer' } };
}

/**
 * Authentication middleware that verifies JWT access tokens.
 * Prioritizes httpOnly cookies for maximum security against XSS.
 */
function authenticate(req, res, next) {
  try {
    // DEBUG: See exactly what cookies the browser sent to the server
    console.log('🍪 [BACKEND] Cookies received from browser:', req.cookies);
    
    // 1. Try reading from httpOnly cookie (Most Secure)
    let token = req.cookies?.[config.auth.cookies.accessName];
    console.log('🔑 [BACKEND] Access token found in cookie?', !!token);
    
    // 2. Fallback to Authorization header (For backward compatibility / API clients)
    if (!token) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    if (!token) {
      throw new AuthError('Authentication required. Please log in.');
    }

    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    
    logger.debug('User authenticated', { userId: decoded.sub, role: decoded.role, path: req.originalUrl });
    next();
  } catch (error) {
    logger.warn('Authentication failed', { path: req.originalUrl, method: req.method, ip: req.ip, reason: error.message });
    next(error);
  }
}

/**
 * Optional authentication middleware.
 * Verifies the token if present but does not fail if no token is provided.
 */
function optionalAuth(req, res, next) {
  try {
    let token = req.cookies?.[config.auth.cookies.accessName];
    if (!token) token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    }
  } catch (error) {
    logger.debug('Optional authentication skipped', { path: req.originalUrl, reason: error.message });
  }
  next();
}

module.exports = { authenticate, optionalAuth };