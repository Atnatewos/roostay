// packages/api/controllers/user.controller.js
// User controller - handles HTTP requests for user profile endpoints
// Supports profile retrieval, updates, admin user management, and host upgrades
const userService = require('../../services/user.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const userController = {
  /**
   * GET /api/users/profile
   * Returns the authenticated user's full profile.
   */
  getProfile: asyncHandler(async (req, res) => {
    const profile = await userService.getProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: { user: profile },
    });
  }),

  /**
   * PUT /api/users/profile
   * Updates the authenticated user's profile information.
   * Body: { firstName?, lastName?, phoneNumber?, profileImageUrl? }
   */
  updateProfile: asyncHandler(async (req, res) => {
    const updated = await userService.updateProfile(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: updated },
    });
  }),

  /**
   * GET /api/users/:id
   * Returns a user's public profile by ID.
   * Accessible by any authenticated user.
   */
  getUserById: asyncHandler(async (req, res) => {
    const profile = await userService.getProfile(req.params.id);
    res.status(200).json({
      success: true,
      data: { user: profile },
    });
  }),

  /**
   * GET /api/admin/users
   * Lists all users with filters (admin only).
   * Query: { page, limit, role, isVerified, isActive, search }
   */
  listUsers: asyncHandler(async (req, res) => {
    const result = await userService.listUsers(req.query);
    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  }),

  /**
   * PATCH /api/admin/users/:id/toggle-status
   * Activates or deactivates a user account (admin only).
   * Body: { isActive: boolean }
   */
  toggleUserStatus: asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    const updated = await userService.updateProfile(req.params.id, { isActive });
    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { user: updated },
    });
  }),

  /**
   * POST /api/users/become-host
   * Upgrades the authenticated guest user to a host role.
   */
  becomeHost: asyncHandler(async (req, res) => {
    const updatedUser = await userService.becomeHost(req.user.id);
    
    logger.info('User became a host via API', {
      userId: req.user.id,
      newRole: updatedUser.role,
    });

    res.status(200).json({
      success: true,
      message: 'Congratulations! You are now a host.',
      data: { user: updatedUser },
    });
  }),
};

module.exports = userController;