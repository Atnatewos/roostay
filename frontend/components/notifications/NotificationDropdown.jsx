// frontend/components/notifications/NotificationDropdown.jsx
// Dropdown panel showing recent notifications
// Includes mark all as read button and notification list
// Navigates to relevant pages when clicking notifications
// Uses CSS classes from the design system
'use client';

import Link from 'next/link';
import NotificationItem from './NotificationItem';

/**
 * Notification Dropdown Component
 * Displays a dropdown panel with recent notifications.
 * Includes a "Mark all as read" button and a list of notifications.
 */
export default function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}) {
  return (
    <div className="notification-dropdown">
      {/* Header */}
      <div className="notification-dropdown__header">
        <h3 className="notification-dropdown__title">Notifications</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="notification-dropdown__mark-all"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="notification-dropdown__list">
        {notifications.length === 0 ? (
          <div className="notification-dropdown__empty">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onClose={onClose}
            />
          ))
        )}
      </div>

      {/* Footer - View All Link */}
      {notifications.length > 0 && (
        <div className="notification-dropdown__footer">
          <Link
            href="/guest/notifications"
            onClick={onClose}
            className="notification-dropdown__view-all"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}