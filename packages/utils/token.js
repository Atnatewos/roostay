// packages/utils/token.js
// JWT token utility for ROOSTAY authentication
// Handles access token and refresh token generation and verification
// Prioritizes environment variables for secrets to ensure zero hardcoded credentials

const jwt = require('jsonwebtoken');
const { AuthError } = require('./errors');
const logger = require('./logger');

// Attempt to load centralized config, fallback to empty object if unavailable
let appConfig;
try {
  appConfig = require('@roostay/config');
} catch {
  appConfig = {};
}

/**
 * Resolves authentication configuration.
 * Environment variables take absolute precedence over config files for secrets,
 * adhering to the twelve-factor app methodology and preventing hardcoded credentials.
 */
const authConfig = {
  jwtSecret: process.env.JWT_SECRET || appConfig.auth?.jwtSecret,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || appConfig.auth?.jwtRefreshSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || appConfig.auth?.jwtExpiresIn || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || appConfig.auth?.jwtRefreshExpiresIn || '7d',
  tokenType: appConfig.auth?.tokenType || 'Bearer',
};

// Security Check: Ensure critical secrets are defined before proceeding
// This prevents cryptic 'secretOrPrivateKey must have a value' crashes from jsonwebtoken
if (!authConfig.jwtSecret) {
  logger.error('FATAL: JWT_SECRET is missing. Define it in your .env file.');
  throw new Error('JWT_SECRET must be defined in environment variables');
}

if (!authConfig.jwtRefreshSecret) {
  logger.error('FATAL: JWT_REFRESH_SECRET is missing. Define it in your .env file.');
  throw new Error('JWT_REFRESH_SECRET must be defined in environment variables');
}

/**
 * Generates an access token for an authenticated user.
 * The token contains the user ID, email, and role for authorization checks.
 *
 * @param {Object} user - User object with id, email, and role properties
 * @returns {string} Signed JWT access token
 */
function generateAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };

  return jwt.sign(payload, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtExpiresIn,
  });
}

/**
 * Generates a refresh token for extending user sessions.
 * Refresh tokens have a longer lifespan and are used to obtain new access tokens.
 *
 * @param {Object} user - User object with id property
 * @returns {string} Signed JWT refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    sub: user.id,
    type: 'refresh',
  };

  return jwt.sign(payload, authConfig.jwtRefreshSecret, {
    expiresIn: authConfig.jwtRefreshExpiresIn,
  });
}

/**
 * Generates both access and refresh tokens for a user.
 * Convenience function for login and registration flows.
 *
 * @param {Object} user - User object with id, email, and role properties
 * @returns {Object} Tokens object { accessToken, refreshToken, tokenType, expiresIn }
 */
function generateTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  logger.info('Token pair generated', { userId: user.id, role: user.role });

  return {
    accessToken,
    refreshToken,
    tokenType: authConfig.tokenType,
    expiresIn: authConfig.jwtExpiresIn,
  };
}

/**
 * Verifies and decodes an access token.
 * Throws AuthError if the token is invalid, expired, or not an access token.
 *
 * @param {string} token - The JWT access token to verify
 * @returns {Object} Decoded token payload { sub, email, role, type }
 * @throws {AuthError} If token is invalid or expired
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret);

    // Ensure this is an access token, not a refresh token
    if (decoded.type !== 'access') {
      throw new AuthError('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    if (error.name === 'TokenExpiredError') {
      throw new AuthError('Access token has expired');
    }

    if (error.name === 'JsonWebTokenError') {
      throw new AuthError('Invalid access token');
    }

    logger.error('Token verification failed', { error: error.message });
    throw new AuthError('Token verification failed');
  }
}

/**
 * Verifies and decodes a refresh token.
 * Throws AuthError if the token is invalid, expired, or not a refresh token.
 *
 * @param {string} token - The JWT refresh token to verify
 * @returns {Object} Decoded token payload { sub, type }
 * @throws {AuthError} If token is invalid or expired
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, authConfig.jwtRefreshSecret);

    // Ensure this is a refresh token, not an access token
    if (decoded.type !== 'refresh') {
      throw new AuthError('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    if (error.name === 'TokenExpiredError') {
      throw new AuthError('Refresh token has expired');
    }

    if (error.name === 'JsonWebTokenError') {
      throw new AuthError('Invalid refresh token');
    }

    logger.error('Refresh token verification failed', { error: error.message });
    throw new AuthError('Token verification failed');
  }
}

/**
 * Extracts the JWT token from the Authorization header.
 * Supports the "Bearer <token>" format.
 *
 * @param {string} authHeader - The Authorization header value
 * @returns {string|null} Extracted token or null if not found
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith(`${authConfig.tokenType} `)) {
    return null;
  }

  return authHeader.split(' ')[1];
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
};