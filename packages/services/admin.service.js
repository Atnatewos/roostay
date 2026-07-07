// packages/services/admin.service.js
// Admin service - dashboard statistics, user management, listing moderation
// All operations require admin role authorization

const { query, queryOne } = require('../database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

const adminService = {
  /**
   * Gets dashboard statistics for the admin panel.
   * Includes user counts, listing counts, booking stats, and revenue.
   *
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats() {
    const stats = {};

    // User statistics
    const userStats = await queryOne(
      `SELECT COUNT(*) as total_users,
              COUNT(*) FILTER (WHERE role = 'guest') as total_guests,
              COUNT(*) FILTER (WHERE role = 'host') as total_hosts,
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d
       FROM users WHERE is_active = true`
    );
    stats.users = userStats;

    // Listing statistics
    const listingStats = await queryOne(
      `SELECT COUNT(*) as total_listings,
              COUNT(*) FILTER (WHERE listing_type IN ('short_term', 'both')) as short_term,
              COUNT(*) FILTER (WHERE listing_type IN ('long_term', 'both')) as long_term,
              COUNT(*) FILTER (WHERE is_approved = false AND approval_status = 'pending') as pending_approval,
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_listings_30d
       FROM listings WHERE is_active = true`
    );
    stats.listings = listingStats;

    // Booking statistics
    const bookingStats = await queryOne(
      `SELECT COUNT(*) as total_bookings,
              COUNT(*) FILTER (WHERE status = 'pending') as pending,
              COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
              COUNT(*) FILTER (WHERE status = 'completed') as completed,
              COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as bookings_30d
       FROM bookings`
    );
    stats.bookings = bookingStats;

    // Revenue statistics
    const revenueStats = await queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) as total_revenue,
              COALESCE(SUM(service_fee), 0) as total_service_fees,
              COALESCE(SUM(total_amount) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) as revenue_30d
       FROM bookings WHERE status IN ('confirmed', 'completed')`
    );
    stats.revenue = revenueStats;

    // Payment statistics
    const paymentStats = await queryOne(
      `SELECT COUNT(*) FILTER (WHERE status = 'pending') as pending_payments,
              COUNT(*) FILTER (WHERE status = 'processing') as processing_payments,
              COUNT(*) FILTER (WHERE status = 'completed') as completed_payments
       FROM payments`
    );
    stats.payments = paymentStats;

    // Withdrawal statistics
    const withdrawalStats = await queryOne(
      `SELECT COUNT(*) FILTER (WHERE status = 'pending') as pending_withdrawals,
              COALESCE(SUM(net_amount) FILTER (WHERE status = 'pending'), 0) as pending_amount
       FROM withdrawals`
    );
    stats.withdrawals = withdrawalStats;

    // Recent activity
    const recentUsers = await query(
      `SELECT id, first_name, last_name, email, role, created_at
       FROM users ORDER BY created_at DESC LIMIT 5`
    );

    const recentBookings = await query(
      `SELECT b.id, b.status, b.total_amount, b.created_at,
              u.first_name, u.last_name,
              l.title as listing_title
       FROM bookings b
       JOIN users u ON b.guest_id = u.id
       JOIN listings l ON b.listing_id = l.id
       ORDER BY b.created_at DESC LIMIT 5`
    );

    stats.recentActivity = {
      users: recentUsers.rows,
      bookings: recentBookings.rows,
    };

    return stats;
  },

  /**
   * Approves or rejects a pending listing.
   *
   * @param {string} listingId - The listing ID
   * @param {string} adminId - The admin user ID
   * @param {string} action - 'approve' or 'reject'
   * @param {string} [notes] - Review notes
   * @returns {Promise<Object>} Updated listing
   */
  async moderateListing(listingId, adminId, action, notes) {
    const listing = await queryOne(
      'SELECT * FROM listings WHERE id = $1',
      [listingId]
    );

    if (!listing) {
      throw new NotFoundError('Listing not found.');
    }

    if (listing.approval_status !== 'pending') {
      throw new ValidationError(
        `Listing has already been ${listing.approval_status}.`
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updated = await queryOne(
      `UPDATE listings
       SET approval_status = $1, is_approved = $2,
           reviewed_by = $3, review_notes = $4, approved_at = NOW()
       WHERE id = $5 RETURNING *`,
      [newStatus, action === 'approve', adminId, notes || null, listingId]
    );

    logger.info(`Listing ${newStatus}`, {
      listingId,
      adminId,
      hostId: listing.host_id,
    });

    return updated;
  },

  /**
   * Toggles user active status (activate/deactivate).
   *
   * @param {string} userId - The target user ID
   * @param {string} adminId - The admin performing the action
   * @param {boolean} isActive - New active status
   * @returns {Promise<Object>} Updated user
   */
  async toggleUserStatus(userId, adminId, isActive) {
    const user = await queryOne(
      'SELECT id, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const updated = await queryOne(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, is_active',
      [isActive, userId]
    );

    logger.info(`User ${isActive ? 'activated' : 'deactivated'}`, {
      userId,
      adminId,
    });

    return updated;
  },

  /**
   * Gets pending listings for moderation.
   *
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated pending listings
   */
  async getPendingListings(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM listings
       WHERE approval_status = 'pending' AND is_active = true`
    );

    const listings = await query(
      `SELECT l.*, u.first_name as host_first_name, u.last_name as host_last_name, u.email as host_email
       FROM listings l
       JOIN users u ON l.host_id = u.id
       WHERE l.approval_status = 'pending' AND l.is_active = true
       ORDER BY l.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      listings: listings.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },
};

module.exports = adminService;