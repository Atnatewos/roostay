// frontend/components/notifications/NotificationItem.jsx
// Single notification row in the dropdown
// Shows icon, title, message, and timestamp
// Navigates to relevant page when clicked
// Marks as read on click
// Uses CSS classes from the design system
'use client';

import Link from 'next/link';

/**
 * Notification Item Component
 * Displays a single notification with icon, title, message, and time.
 */
export default function NotificationItem({ notification, onMarkAsRead, onClose }) {
  const { id, type, title, message, link, is_read, created_at } = notification;

  /**
   * Formats the timestamp to a relative time string.
   */
  function formatTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  /**
   * Returns the appropriate icon based on notification type.
   */
  function getIcon(type) {
    const iconStyle = {
      width: '20px',
      height: '20px',
      flexShrink: 0,
    };

    switch (type) {
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'booking_completed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={iconStyle}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case 'payment_verified':
      case 'payment_received':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={iconStyle}>
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        );
      case 'new_message':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={iconStyle}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'review_received':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={iconStyle}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={iconStyle}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  }

  /**
   * Handles clicking the notification.
   */
  function handleClick() {
    if (!is_read) {
      onMarkAsRead(id);
    }
    onClose();
  }

  const content = (
    <div
      onClick={handleClick}
      className={`notification-item ${!is_read ? 'notification-item--unread' : ''}`}
    >
      {/* Icon */}
      <div className="notification-item__icon">
        {getIcon(type)}
      </div>

      {/* Content */}
      <div className="notification-item__content">
        <p className="notification-item__title">{title}</p>
        <p className="notification-item__message">{message}</p>
        <p className="notification-item__time">{formatTime(created_at)}</p>
      </div>

      {/* Unread Indicator */}
      {!is_read && <div className="notification-item__unread-dot" />}
    </div>
  );

  // Wrap in Link if there's a destination
  if (link) {
    return (
      <Link href={link} style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }

  return content;
}