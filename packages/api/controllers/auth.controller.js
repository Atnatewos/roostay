// packages/api/controllers/auth.controller.js
// Authentication controller - handles HTTP requests for auth endpoints
// Sets and clears httpOnly cookies for secure token storage
// Dynamically configures cookie security based on environment
// Author: Theron

const userService = require('../../services/user.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const { AuthError } = require('../../utils/errors');
const logger = require('../../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    auth: {
      cookies: {
        accessName: 'roostay_access_token',
        refreshName: 'roostay_refresh_token',
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAgeAccess: 900000,
        maxAgeRefresh: 604800000,
        path: '/',
        domain: process.env.COOKIE_DOMAIN || undefined,
      },
    },
  };
}

/**
 * Builds the cookie options object based on the current environment.
 * In production (Vercel):
 *   - secure: true (HTTPS only)
 *   - sameSite: 'none' (allows cross-origin requests from the same Vercel domain)
 *   - domain: undefined (let the browser auto-detect from the request host)
 * In development (localhost):
 *   - secure: false (HTTP allowed)
 *   - sameSite: 'lax' (strict enough for local dev)
 *
 * @returns {Object} Cookie configuration options for res.cookie()
 */
function getCookieOptions() {
  const cookieConfig = config.auth.cookies;
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: undefined, // set per cookie below
    path: cookieConfig.path || '/',
    // Only set domain if explicitly configured via COOKIE_DOMAIN env var
    // On Vercel, leaving domain undefined lets the browser handle it automatically
    ...(cookieConfig.domain ? { domain: cookieConfig.domain } : {}),
  };
}

/**
 * Sets authentication cookies (access + refresh) on the response.
 * Uses environment-aware cookie options for cross-environment compatibility.
 *
 * @param {Object} res    - Express response object
 * @param {Object} tokens - Token pair { accessToken, refreshToken }
 */
function setAuthCookies(res, tokens) {
  const cookieConfig = config.auth.cookies;
  const baseOptions = getCookieOptions();

  // Access token — short lived (15 min)
  res.cookie(cookieConfig.accessName, tokens.accessToken, {
    ...baseOptions,
    maxAge: cookieConfig.maxAgeAccess || 900000,
  });

  // Refresh token — long lived (7 days)
  res.cookie(cookieConfig.refreshName, tokens.refreshToken, {
    ...baseOptions,
    maxAge: cookieConfig.maxAgeRefresh || 604800000,
  });
}

/**
 * Clears authentication cookies from the browser.
 * Uses the same cookie options as setAuthCookies to ensure proper clearing.
 *
 * @param {Object} res - Express response object
 */
function clearAuthCookies(res) {
  const cookieConfig = config.auth.cookies;
  const baseOptions = getCookieOptions();

  // Remove maxAge and set expires to past date for clearing
  const clearOptions = {
    ...baseOptions,
    maxAge: undefined,
    expires: new Date(0),
  };

  res.clearCookie(cookieConfig.accessName, clearOptions);
  res.clearCookie(cookieConfig.refreshName, clearOptions);
}

const authController = {
  /**
   * POST /api/auth/register
   * Creates a new user account and sets authentication cookies.
   */
  register: asyncHandler(async (req, res) => {
    const result = await userService.register(req.body);
    setAuthCookies(res, result.tokens);

    logger.info('User registered via API', {
      userId: result.user.id,
      email: result.user.email,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user: result.user },
    });
  }),

  /**
   * POST /api/auth/login
   * Authenticates a user and sets authentication cookies.
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await userService.login(email, password);
    setAuthCookies(res, result.tokens);

    logger.info('User logged in via API', {
      userId: result.user.id,
      role: result.user.role,
    });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: { user: result.user },
    });
  }),

  /**
   * POST /api/auth/refresh-token
   * Issues a new token pair using the refresh token from the httpOnly cookie.
   */
  refreshToken: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[config.auth.cookies.refreshName];

    if (!refreshToken) {
      throw new AuthError('Refresh token missing. Please log in again.');
    }

    const result = await userService.refreshToken(refreshToken);
    setAuthCookies(res, result.tokens);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: { user: result.user },
    });
  }),

  /**
   * POST /api/auth/logout
   * Clears authentication cookies.
   */
  logout: asyncHandler(async (req, res) => {
    clearAuthCookies(res);

    logger.info('User logged out via API', { userId: req.user?.id });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }),

  /**
   * POST /api/auth/change-password
   * Changes the authenticated user's password and clears cookies.
   */
  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user.id, currentPassword, newPassword);
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    });
  }),

  /**
   * GET /api/auth/me
   * Returns the authenticated user's profile.
   */
  getMe: asyncHandler(async (req, res) => {
    const profile = await userService.getProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: { user: profile },
    });
  }),
};

module.exports = authController;