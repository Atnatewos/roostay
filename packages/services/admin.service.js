// packages/services/admin.service.js
// Admin service - dashboard statistics, user management, listing moderation
// Includes audit logging for all admin actions and audit log retrieval
// All operations require admin role authorization
// Author: Theron

const { query, queryOne } = require('../database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');
const events = require('../utils/events');

const adminService = {
  /**
   * Gets dashboard statistics for the admin panel.
   * Includes user counts, listing counts, booking stats, and revenue.
   * Supports optional dateRange parameter for time-filtered data.
   *
   * @param {string} [dateRange] - Number of days to filter data (e.g., '30')
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats(dateRange) {
    const stats = {};
    const days = parseInt(dateRange, 10) || null;
    const dateFilter = days ? `AND created_at > NOW() - INTERVAL '${days} days'` : '';

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

    // Booking statistics with optional date filter
    const bookingStats = await queryOne(
      `SELECT COUNT(*) as total_bookings,
              COUNT(*) FILTER (WHERE status = 'pending') as pending,
              COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
              COUNT(*) FILTER (WHERE status = 'completed') as completed,
              COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as bookings_30d
       FROM bookings${days ? ` WHERE created_at > NOW() - INTERVAL '${days} days'` : ''}`
    );
    stats.bookings = bookingStats;

    // Revenue statistics with optional date filter
    const revenueStats = await queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) as total_revenue,
              COALESCE(SUM(service_fee), 0) as total_service_fees,
              COALESCE(SUM(total_amount) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) as revenue_30d
       FROM bookings WHERE status IN ('confirmed', 'completed')${days ? ` AND created_at > NOW() - INTERVAL '${days} days'` : ''}`
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
   * Logs the action to the audit trail for accountability.
   *
   * @param {string} listingId - The listing ID
   * @param {string} adminId   - The admin user ID
   * @param {string} action    - 'approve' or 'reject'
   * @param {string} [notes]   - Review notes
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

    // Insert audit log entry for this moderation action
    await query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminId,
        `listing_${newStatus}`,
        'listing',
        listingId,
        JSON.stringify({ approval_status: listing.approval_status, is_approved: listing.is_approved }),
        JSON.stringify({ approval_status: newStatus, is_approved: action === 'approve', review_notes: notes || null }),
      ]
    );

    events.listingCreated(updated, listing.host_id);

    logger.info(`Listing ${newStatus}`, {
      listingId,
      adminId,
      hostId: listing.host_id,
    });

    return updated;
  },

  /**
   * Toggles user active status (activate/deactivate).
   * Logs the action to the audit trail for accountability.
   *
   * @param {string}  userId   - The target user ID
   * @param {string}  adminId  - The admin performing the action
   * @param {boolean} isActive - New active status
   * @returns {Promise<Object>} Updated user
   */
  async toggleUserStatus(userId, adminId, isActive) {
    const user = await queryOne(
      'SELECT id, email, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const updated = await queryOne(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, is_active',
      [isActive, userId]
    );

    // Insert audit log entry for this user status change
    await query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminId,
        isActive ? 'user_activated' : 'user_deactivated',
        'user',
        userId,
        JSON.stringify({ is_active: user.is_active }),
        JSON.stringify({ is_active: isActive }),
      ]
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

  /**
   * Retrieves paginated audit logs for the admin audit trail viewer.
   * Shows all admin actions with old and new values for accountability.
   *
   * @param {Object} options - Pagination and filter options
   * @param {number} [options.page=1]   - Page number
   * @param {number} [options.limit=20] - Items per page
   * @param {string} [options.action]   - Filter by action type
   * @param {string} [options.entityType] - Filter by entity type (user, listing, booking, payment)
   * @returns {Promise<Object>} Paginated audit log entries
   */
  async getAuditLogs(options = {}) {
    const { page = 1, limit = 20, action, entityType } = options;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (action) {
      whereClause += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (entityType) {
      whereClause += ` AND al.entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM audit_logs al WHERE 1=1${whereClause}`,
      params
    );

    params.push(limit);
    params.push(offset);

    const logs = await query(
      `SELECT al.*, u.first_name as admin_first_name, u.last_name as admin_last_name, u.email as admin_email
       FROM audit_logs al
       JOIN users u ON al.admin_id = u.id
       WHERE 1=1${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return {
      logs: logs.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },

  /**
   * Exports users data as a CSV-formatted array.
   * Used by the admin panel for data export functionality.
   *
   * @param {Object} options - Filter options (search, role)
   * @returns {Promise<Array>} Array of user objects ready for CSV conversion
   */
  async exportUsers(options = {}) {
    const { search, role } = options;

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number, u.role,
              u.is_active, u.is_verified, u.created_at
       FROM users u
       WHERE 1=1${whereClause}
       ORDER BY u.created_at DESC
       LIMIT 1000`,
      params
    );

    return result.rows;
  },

  /**
   * Exports payments data as a CSV-formatted array.
   * Used by the admin panel for data export functionality.
   *
   * @param {Object} options - Filter options (status, search)
   * @returns {Promise<Array>} Array of payment objects ready for CSV conversion
   */
  async exportPayments(options = {}) {
    const { status, search } = options;

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR p.transaction_reference ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await query(
      `SELECT p.id, p.amount, p.currency, p.payment_method, p.status,
              p.transaction_reference, p.created_at,
              u.first_name, u.last_name, u.email,
              l.title as listing_title
       FROM payments p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN listings l ON b.listing_id = l.id
       WHERE 1=1${whereClause}
       ORDER BY p.created_at DESC
       LIMIT 1000`,
      params
    );

    return result.rows;
  },
};

module.exports = adminService;