// frontend/lib/date.js
// Centralized date formatting utilities for ROOSTAY
// Eliminates duplicated formatDate() and formatRelativeTime() across all pages
// All formatting options are config-driven via Intl.DateTimeFormat
// Author: Theron

/**
 * Formats an ISO date string into a human-readable format.
 *
 * @param {string} dateStr    - ISO date string (e.g., "2026-07-22T10:30:00Z")
 * @param {Object} [options]  - Intl.DateTimeFormat options override
 * @param {string} [options.format] - Preset format: 'short', 'long', 'datetime', 'relative'
 * @returns {string} Formatted date string, or 'N/A' if input is invalid
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return 'N/A';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';

  const { format = 'short' } = options;

  switch (format) {
    case 'long':
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    case 'datetime':
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    case 'relative':
      return formatRelativeTime(date);

    case 'short':
    default:
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  }
}

/**
 * Formats a date relative to the current time.
 * Examples: "Just now", "5m ago", "3h ago", "2d ago", "Jul 14"
 *
 * @param {Date|string} date - Date object or ISO date string
 * @returns {string} Relative time description
 */
export function formatRelativeTime(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  const diff = Date.now() - dateObj.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date into ISO date string (YYYY-MM-DD).
 * Useful for input[type=date] values.
 *
 * @param {Date|string} date - Date object or ISO date string
 * @returns {string} ISO date string (date portion only), or empty string if invalid
 */
export function toISODateString(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}