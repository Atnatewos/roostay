// packages/api/controllers/admin.controller.js
// Admin controller - handles admin-only endpoints
// Dashboard statistics, listing moderation, user management, audit logs, and data exports
// Author: Theron

const adminService = require('../../services/admin.service');
const listingService = require('../../services/listing.service');
const userService = require('../../services/user.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const adminController = {
  /**
   * GET /api/admin/dashboard
   * Returns dashboard statistics for the admin panel.
   * Query: { dateRange } - optional number of days to filter data
   */
  getDashboardStats: asyncHandler(async (req, res) => {
    const { dateRange } = req.query;
    const stats = await adminService.getDashboardStats(dateRange);

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

  /**
   * GET /api/admin/audit-logs
   * Returns paginated audit trail entries.
   * Query: { page, limit, action, entityType }
   */
  getAuditLogs: asyncHandler(async (req, res) => {
    const result = await adminService.getAuditLogs(req.query);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  }),

  /**
   * GET /api/admin/export/users
   * Exports users as CSV data.
   * Query: { search, role }
   */
  exportUsers: asyncHandler(async (req, res) => {
    const users = await adminService.exportUsers(req.query);

    // Build CSV content
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Active', 'Verified', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const user of users) {
      csvRows.push([
        user.id,
        `"${(user.first_name || '').replace(/"/g, '""')}"`,
        `"${(user.last_name || '').replace(/"/g, '""')}"`,
        user.email || '',
        user.phone_number || '',
        user.role || '',
        user.is_active ? 'Yes' : 'No',
        user.is_verified ? 'Yes' : 'No',
        user.created_at || '',
      ].join(','));
    }

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=roostay-users-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csvContent);
  }),

  /**
   * GET /api/admin/export/payments
   * Exports payments as CSV data.
   * Query: { status, search }
   */
  exportPayments: asyncHandler(async (req, res) => {
    const payments = await adminService.exportPayments(req.query);

    // Build CSV content
    const headers = ['ID', 'Amount', 'Currency', 'Method', 'Status', 'Transaction Ref', 'Guest Name', 'Guest Email', 'Listing', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const payment of payments) {
      csvRows.push([
        payment.id,
        payment.amount || 0,
        payment.currency || 'ETB',
        payment.payment_method || '',
        payment.status || '',
        payment.transaction_reference || '',
        `"${(payment.first_name || '')} ${(payment.last_name || '')}"`,
        payment.email || '',
        `"${(payment.listing_title || '').replace(/"/g, '""')}"`,
        payment.created_at || '',
      ].join(','));
    }

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=roostay-payments-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csvContent);
  }),
};

module.exports = adminController;