// packages/services/notification.service.js
// Notification service - creates and manages user notifications
// Used internally by other services for booking updates, messages, etc.

const { query, queryOne } = require('../database');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = { features: { notificationsEnabled: true } };
}

const notificationService = {
  /**
   * Creates a notification for a user.
   *
   * @param {string} userId - The recipient user ID
   * @param {string} type - Notification type (booking_confirmed, booking_cancelled, payment_received, etc.)
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} [link] - Optional deep link
   * @param {Object} [metadata] - Additional metadata
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(userId, type, title, message, link, metadata) {
    if (!config.features.notificationsEnabled) {
      return null;
    }

    const notification = await queryOne(
      `INSERT INTO notifications (user_id, type, title, message, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        type,
        title,
        message,
        link || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    logger.debug('Notification created', {
      notificationId: notification.id,
      userId,
      type,
    });

    return notification;
  },

  /**
   * Creates a notification for booking status changes.
   * Sends to both guest and host with appropriate messages.
   *
   * @param {Object} booking - The booking object
   * @param {string} status - The new booking status
   */
  async notifyBookingStatusChange(booking, status) {
    const notifications = [];

    switch (status) {
      case 'confirmed':
        notifications.push(
          this.createNotification(
            booking.guest_id,
            'booking_confirmed',
            'Booking Confirmed',
            `Your booking has been confirmed. Check-in: ${booking.check_in_date}`,
            `/bookings/${booking.id}`
          ),
          this.createNotification(
            booking.host_id,
            'booking_confirmed',
            'New Booking Confirmed',
            `A new booking has been confirmed for your listing.`,
            `/host/bookings/${booking.id}`
          )
        );
        break;

      case 'cancelled':
        notifications.push(
          this.createNotification(
            booking.host_id,
            'booking_cancelled',
            'Booking Cancelled',
            'A booking for your listing has been cancelled.',
            `/host/bookings/${booking.id}`
          )
        );
        break;

      case 'completed':
        notifications.push(
          this.createNotification(
            booking.guest_id,
            'booking_completed',
            'Stay Completed',
            'Your stay has been completed. Please leave a review!',
            `/bookings/${booking.id}/review`
          ),
          this.createNotification(
            booking.host_id,
            'booking_completed',
            'Booking Completed',
            'A guest has completed their stay. Payment is being processed.',
            `/host/bookings/${booking.id}`
          )
        );
        break;
    }

    await Promise.all(notifications);
  },

  /**
   * Gets notifications for a user with unread count.
   *
   * @param {string} userId - The user ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated notifications with unread count
   */
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (unreadOnly) {
      whereClause += ` AND is_read = false`;
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      params
    );

    const unreadCount = await queryOne(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    params.push(limit);
    params.push(offset);

    const notifications = await query(
      `SELECT * FROM notifications ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return {
      notifications: notifications.rows,
      unreadCount: parseInt(unreadCount.count, 10),
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },

  /**
   * Marks a notification as read.
   *
   * @param {string} notificationId - The notification ID
   * @param {string} userId - The user ID (for verification)
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId, userId) {
    const notification = await queryOne(
      'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (!notification) {
      throw new NotFoundError('Notification not found.');
    }

    return await queryOne(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 RETURNING *`,
      [notificationId]
    );
  },

  /**
   * Marks all notifications as read for a user.
   *
   * @param {string} userId - The user ID
   * @returns {Promise<number>} Number of notifications marked as read
   */
  async markAllAsRead(userId) {
    const result = await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    logger.debug('All notifications marked as read', { userId, count: result.rowCount });

    return result.rowCount;
  },
};

module.exports = notificationService;