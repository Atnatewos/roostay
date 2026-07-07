// packages/api/controllers/admin.controller.js
// Admin controller - handles admin-only endpoints
// Dashboard statistics, listing moderation, and user management

const adminService = require('../../services/admin.service');
const listingService = require('../../services/listing.service');
const userService = require('../../services/user.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const adminController = {
  /**
   * GET /api/admin/dashboard
   * Returns dashboard statistics for the admin panel.
   */
  getDashboardStats: asyncHandler(async (req, res) => {
    const stats = await adminService.getDashboardStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  }),

  /**
   * GET /api/admin/listings/pending
   * Returns pending listings awaiting approval.
   * Query: { page, limit }
   */
  getPendingListings: asyncHandler(async (req, res) => {
    const result = await adminService.getPendingListings(req.query);

    res.status(200).json({
      success: true,
      data: result.listings,
      pagination: result.pagination,
    });
  }),

  /**
   * PATCH /api/admin/listings/:id/moderate
   * Approves or rejects a pending listing.
   * Body: { action: 'approve'|'reject', notes? }
   */
  moderateListing: asyncHandler(async (req, res) => {
    const { action, notes } = req.body;

    const listing = await adminService.moderateListing(
      req.params.id,
      req.user.id,
      action,
      notes
    );

    logger.info(`Listing ${action}d via admin API`, {
      listingId: req.params.id,
      adminId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: `Listing ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      data: { listing },
    });
  }),

  /**
   * DELETE /api/admin/listings/:id
   * Deletes any listing (admin override).
   */
  deleteListing: asyncHandler(async (req, res) => {
    await listingService.deleteListing(req.params.id, req.user.id, 'admin');

    logger.info('Listing deleted by admin', {
      listingId: req.params.id,
      adminId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Listing deleted successfully.',
    });
  }),

  /**
   * PATCH /api/admin/users/:id/toggle-status
   * Activates or deactivates a user.
   * Body: { isActive: boolean }
   */
  toggleUserStatus: asyncHandler(async (req, res) => {
    const { isActive } = req.body;

    const user = await adminService.toggleUserStatus(req.params.id, req.user.id, isActive);

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { user },
    });
  }),
};

module.exports = adminController;