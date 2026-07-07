// packages/api/controllers/notification.controller.js
// Notification controller - handles notification retrieval and read status

const notificationService = require('../../services/notification.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const notificationController = {
  /**
   * GET /api/notifications
   * Returns notifications for the authenticated user.
   * Query: { page, limit, unreadOnly }
   */
  getUserNotifications: asyncHandler(async (req, res) => {
    const result = await notificationService.getUserNotifications(req.user.id, req.query);

    res.status(200).json({
      success: true,
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
      },
      pagination: result.pagination,
    });
  }),

  /**
   * PATCH /api/notifications/:id/read
   * Marks a single notification as read.
   */
  markAsRead: asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: { notification },
    });
  }),

  /**
   * PATCH /api/notifications/read-all
   * Marks all notifications as read for the authenticated user.
   */
  markAllAsRead: asyncHandler(async (req, res) => {
    const count = await notificationService.markAllAsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: `${count} notification(s) marked as read.`,
      data: { markedCount: count },
    });
  }),
};

module.exports = notificationController;