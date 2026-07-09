// packages/api/controllers/auth.controller.js
// Authentication controller - handles HTTP requests for auth endpoints
// Sets and clears httpOnly cookies for secure token storage
const userService = require('../../services/user.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const { AuthError } = require('../../utils/errors');
const logger = require('../../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = { auth: { cookies: { accessName: 'roostay_access_token', refreshName: 'roostay_refresh_token', secure: false, sameSite: 'lax', maxAgeAccess: 900000, maxAgeRefresh: 604800000, path: '/' } } };
}

/**
 * Helper to set secure authentication cookies
 */
function setAuthCookies(res, tokens) {
  const cookieConfig = config.auth.cookies;
  
  res.cookie(cookieConfig.accessName, tokens.accessToken, {
    httpOnly: true,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    maxAge: cookieConfig.maxAgeAccess,
    path: cookieConfig.path,
  });

  res.cookie(cookieConfig.refreshName, tokens.refreshToken, {
    httpOnly: true,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    maxAge: cookieConfig.maxAgeRefresh,
    path: cookieConfig.path,
  });
}

/**
 * Helper to clear authentication cookies
 */
function clearAuthCookies(res) {
  const cookieConfig = config.auth.cookies;
  res.clearCookie(cookieConfig.accessName, { path: cookieConfig.path });
  res.clearCookie(cookieConfig.refreshName, { path: cookieConfig.path });
}

const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await userService.register(req.body);
    setAuthCookies(res, result.tokens);
    logger.info('User registered via API', { userId: result.user.id, email: result.user.email });
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user: result.user },
    });
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await userService.login(email, password);
    setAuthCookies(res, result.tokens);
    logger.info('User logged in via API', { userId: result.user.id, role: result.user.role });
    
    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: { user: result.user },
    });
  }),

  refreshToken: asyncHandler(async (req, res) => {
    // Read refresh token from httpOnly cookie
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

  logout: asyncHandler(async (req, res) => {
    clearAuthCookies(res);
    logger.info('User logged out via API', { userId: req.user?.id });
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user.id, currentPassword, newPassword);
    clearAuthCookies(res);
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    });
  }),

  getMe: asyncHandler(async (req, res) => {
    const profile = await userService.getProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: { user: profile },
    });
  }),
};

module.exports = authController;