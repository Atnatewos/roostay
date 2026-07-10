// frontend/lib/breadcrumbConfig.js
// Breadcrumb configuration for custom labels and icons
// Maps URL paths to human-readable labels
// Supports dynamic segments with custom label functions

/**
 * Breadcrumb configuration object.
 * Maps URL path segments to labels and icons.
 * 
 * @type {Object}
 */
const breadcrumbConfig = {
  // Static path mappings
  '/': { label: 'Home', icon: 'home' },
  '/listings': { label: 'Listings', icon: 'list' },
  '/search': { label: 'Search', icon: 'search' },
  '/login': { label: 'Login', icon: 'login' },
  '/register': { label: 'Register', icon: 'register' },
  
  // Guest dashboard paths
  '/guest': { label: 'Guest Dashboard', icon: 'dashboard' },
  '/guest/dashboard': { label: 'Dashboard', icon: 'dashboard' },
  '/guest/bookings': { label: 'My Bookings', icon: 'calendar' },
  '/guest/favorites': { label: 'Favorites', icon: 'heart' },
  '/guest/profile': { label: 'Profile', icon: 'user' },
  '/guest/profile/edit': { label: 'Edit Profile', icon: 'edit' },
  
  // Host dashboard paths
  '/host': { label: 'Host Dashboard', icon: 'dashboard' },
  '/host/dashboard': { label: 'Dashboard', icon: 'dashboard' },
  '/host/bookings': { label: 'Bookings', icon: 'calendar' },
  '/host/listings': { label: 'My Listings', icon: 'list' },
  '/host/listings/create': { label: 'Create Listing', icon: 'plus' },
  '/host/withdrawals': { label: 'Withdrawals', icon: 'money' },
  
  // Admin dashboard paths
  '/admin': { label: 'Admin Dashboard', icon: 'dashboard' },
  '/admin/dashboard': { label: 'Dashboard', icon: 'dashboard' },
  '/admin/users': { label: 'Users', icon: 'users' },
  '/admin/listings': { label: 'Listings', icon: 'list' },
  '/admin/payments': { label: 'Payments', icon: 'payment' },
  '/admin/withdrawals': { label: 'Withdrawals', icon: 'money' },
  '/admin/reports': { label: 'Reports', icon: 'chart' },
};

/**
 * Dynamic segment label functions.
 * These functions receive the segment value and return a label.
 * Used for dynamic routes like /listings/[id] or /bookings/[id].
 * 
 * @type {Object}
 */
export const dynamicLabels = {
  /**
   * Generates label for listing detail pages.
   * Can be overridden by passing custom data.
   * 
   * @param {string} id - Listing ID
   * @param {Object} [data] - Optional data with listing title
   * @returns {string} Breadcrumb label
   */
  '/listings/[id]': (id, data) => data?.title || 'Listing Details',
  
  /**
   * Generates label for booking detail pages.
   * 
   * @param {string} id - Booking ID
   * @param {Object} [data] - Optional data with booking info
   * @returns {string} Breadcrumb label
   */
  '/guest/bookings/[id]': (id, data) => data?.listingTitle || 'Booking Details',
  '/host/bookings/[id]': (id, data) => data?.guestName || 'Booking Details',
  
  /**
   * Generates label for listing edit pages.
   * 
   * @param {string} id - Listing ID
   * @param {Object} [data] - Optional data with listing title
   * @returns {string} Breadcrumb label
   */
  '/host/listings/[id]/edit': (id, data) => data?.title || 'Edit Listing',
  
  /**
   * Generates label for admin listing detail pages.
   * 
   * @param {string} id - Listing ID
   * @param {Object} [data] - Optional data with listing title
   * @returns {string} Breadcrumb label
   */
  '/admin/listings/[id]': (id, data) => data?.title || 'Listing Details',
};

export default breadcrumbConfig;