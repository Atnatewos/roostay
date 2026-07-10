// frontend/components/notifications/NotificationBell.jsx
// Notification bell icon with controlled open state
// Parent component manages which dropdowns are open
'use client';

import { useRef } from 'react';
import NotificationDropdown from './NotificationDropdown';
import useNotifications from '@/hooks/useNotifications';

/**
 * Notification Bell Component
 * Controlled component - parent manages open state to prevent dropdown overlap
 */
export default function NotificationBell({ isAuthenticated, isOpen, onToggle }) {
  const dropdownRef = useRef(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  function handleToggle() {
    onToggle(!isOpen);
  }

  function handleClose() {
    onToggle(false);
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="notification-bell__button"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClose={handleClose}
        />
      )}
    </div>
  );
}