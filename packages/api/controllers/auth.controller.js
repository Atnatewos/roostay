// packages/api/controllers/auth.controller.js
// Authentication controller - handles HTTP requests for auth endpoints
// Thin layer that parses requests, delegates to services, and sends responses

const userService = require('../../services/user.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const authController = {
  /**
   * POST /api/auth/register
   * Creates a new user account and returns authentication tokens.
   * Body: { email, password, firstName, lastName, phoneNumber? }
   */
  register: asyncHandler(async (req, res) => {
    const result = await userService.register(req.body);

    logger.info('User registered via API', {
      userId: result.user.id,
      email: result.user.email,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: result,
    });
  }),

  /**
   * POST /api/auth/login
   * Authenticates a user with email and password.
   * Body: { email, password }
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await userService.login(email, password);

    logger.info('User logged in via API', {
      userId: result.user.id,
      role: result.user.role,
    });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: result,
    });
  }),

  /**
   * POST /api/auth/refresh-token
   * Issues a new access token using a valid refresh token.
   * Body: { refreshToken }
   */
  refreshToken: asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await userService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: result,
    });
  }),

  /**
   * POST /api/auth/change-password
   * Changes the authenticated user's password.
   * Requires current password verification.
   * Body: { currentPassword, newPassword, confirmPassword }
   */
  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await userService.changePassword(req.user.id, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  }),

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user's profile.
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