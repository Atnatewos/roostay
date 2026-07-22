// frontend/lib/status.js
// Centralized status badge and label utilities for ROOSTAY
// Eliminates duplicated getStatusBadge() and getRoleBadge() across all pages
// All status colors and labels are config-driven
// Author: Theron

/**
 * Default status color mappings.
 * These can be overridden by content.config.json statusLabels section.
 */
const DEFAULT_BOOKING_STATUSES = {
  pending: { label: 'Pending', color: '#F59E0B', variant: 'warning' },
  confirmed: { label: 'Confirmed', color: '#10B981', variant: 'success' },
  cancelled: { label: 'Cancelled', color: '#EF4444', variant: 'danger' },
  completed: { label: 'Completed', color: '#3B82F6', variant: 'info' },
  rejected: { label: 'Rejected', color: '#EF4444', variant: 'danger' },
  expired: { label: 'Expired', color: '#6B7280', variant: 'default' },
};

const DEFAULT_PAYMENT_STATUSES = {
  pending: { label: 'Pending', color: '#F59E0B', variant: 'warning' },
  processing: { label: 'Processing', color: '#3B82F6', variant: 'info' },
  completed: { label: 'Completed', color: '#10B981', variant: 'success' },
  failed: { label: 'Failed', color: '#EF4444', variant: 'danger' },
  refunded: { label: 'Refunded', color: '#8B5CF6', variant: 'default' },
  cancelled: { label: 'Cancelled', color: '#6B7280', variant: 'default' },
  pending_review: { label: 'Pending Review', color: '#F59E0B', variant: 'warning' },
};

const DEFAULT_WITHDRAWAL_STATUSES = {
  pending: { label: 'Pending', color: '#F59E0B', variant: 'warning' },
  processing: { label: 'Processing', color: '#3B82F6', variant: 'info' },
  completed: { label: 'Completed', color: '#10B981', variant: 'success' },
  failed: { label: 'Failed', color: '#EF4444', variant: 'danger' },
  cancelled: { label: 'Cancelled', color: '#6B7280', variant: 'default' },
};

const DEFAULT_APPROVAL_STATUSES = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

const DEFAULT_ROLE_BADGES = {
  admin: { label: 'Admin', variant: 'danger' },
  host: { label: 'Host', variant: 'primary' },
  guest: { label: 'Guest', variant: 'info' },
};

/**
 * Returns the status configuration for a booking status.
 * Merges config-driven values with defaults.
 *
 * @param {string} status   - The booking status code
 * @param {Object} [config] - Optional content.config.json statusLabels.booking section
 * @returns {Object} { label, color, variant }
 */
export function getBookingStatus(status, config) {
  const configStatus = config?.statusLabels?.booking?.[status] || {};
  const defaultStatus = DEFAULT_BOOKING_STATUSES[status] || { label: status, color: '#6B7280', variant: 'default' };

  return {
    label: configStatus.label || defaultStatus.label,
    color: configStatus.color || defaultStatus.color,
    variant: configStatus.variant || defaultStatus.variant,
  };
}

/**
 * Returns the badge variant for a booking status.
 *
 * @param {string} status   - The booking status code
 * @param {Object} [config] - Optional content config
 * @returns {string} Badge variant name
 */
export function getBookingStatusBadge(status, config) {
  return getBookingStatus(status, config).variant;
}

/**
 * Returns the status configuration for a payment status.
 *
 * @param {string} status   - The payment status code
 * @param {Object} [config] - Optional content config
 * @returns {Object} { label, color, variant }
 */
export function getPaymentStatus(status, config) {
  const configStatus = config?.statusLabels?.payment?.[status] || {};
  const defaultStatus = DEFAULT_PAYMENT_STATUSES[status] || { label: status, color: '#6B7280', variant: 'default' };

  return {
    label: configStatus.label || defaultStatus.label,
    color: configStatus.color || defaultStatus.color,
    variant: configStatus.variant || defaultStatus.variant,
  };
}

/**
 * Returns the badge variant for a payment status.
 *
 * @param {string} status   - The payment status code
 * @param {Object} [config] - Optional content config
 * @returns {string} Badge variant name
 */
export function getPaymentStatusBadge(status, config) {
  return getPaymentStatus(status, config).variant;
}

/**
 * Returns the status configuration for a withdrawal status.
 *
 * @param {string} status   - The withdrawal status code
 * @param {Object} [config] - Optional content config
 * @returns {Object} { label, color, variant }
 */
export function getWithdrawalStatus(status, config) {
  const defaultStatus = DEFAULT_WITHDRAWAL_STATUSES[status] || { label: status, color: '#6B7280', variant: 'default' };
  return defaultStatus;
}

/**
 * Returns the badge variant for a withdrawal status.
 *
 * @param {string} status - The withdrawal status code
 * @returns {string} Badge variant name
 */
export function getWithdrawalStatusBadge(status) {
  return getWithdrawalStatus(status).variant;
}

/**
 * Returns the status configuration for a listing approval status.
 *
 * @param {string} status - The approval status code
 * @returns {Object} { label, variant }
 */
export function getApprovalStatus(status) {
  return DEFAULT_APPROVAL_STATUSES[status] || { label: status, variant: 'default' };
}

/**
 * Returns the badge variant for a listing approval status.
 *
 * @param {string} status - The approval status code
 * @returns {string} Badge variant name
 */
export function getApprovalStatusBadge(status) {
  return getApprovalStatus(status).variant;
}

/**
 * Returns the role badge configuration for a user role.
 *
 * @param {string} role - The user role code
 * @returns {Object} { label, variant }
 */
export function getRoleBadge(role) {
  return DEFAULT_ROLE_BADGES[role] || { label: role, variant: 'default' };
}

/**
 * Returns the badge variant for a user role.
 *
 * @param {string} role - The user role code
 * @returns {string} Badge variant name
 */
export function getRoleBadgeVariant(role) {
  return getRoleBadge(role).variant;
}

/**
 * Formats a status string for display (capitalizes first letter).
 *
 * @param {string} status - The raw status string
 * @returns {string} Formatted status label
 */
export function formatStatusLabel(status) {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}