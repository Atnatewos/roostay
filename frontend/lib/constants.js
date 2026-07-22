// frontend/lib/constants.js
// Centralized frontend constants — all values driven by environment variables
// or loaded from the backend config system at runtime via useConfig() hook
// For server components, use the config module directly
// Author: Theron

// ============================================================================
// APPLICATION DEFAULTS
// These are fallback values used when the config API is unavailable.
// In normal operation, useConfig() provides the actual config from the backend.
// ============================================================================

const constants = {
  // ============================================================================
  // APPLICATION CONFIGURATION (from environment variables)
  // ============================================================================
  API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'ROOSTAY',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  APP_DESCRIPTION: 'Find your perfect stay in Ethiopia.',

  // ============================================================================
  // PAGINATION & LIMITS (from features.config.json — fallback values)
  // ============================================================================
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 50,
  MAX_IMAGE_SIZE_MB: 5,
  MAX_IMAGES_PER_LISTING: 15,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],

  // ============================================================================
  // CURRENCY DEFAULTS (from payment.config.json — fallback values)
  // ============================================================================
  CURRENCY: 'ETB',
  CURRENCY_SYMBOL: 'Br',

  // ============================================================================
  // GEOGRAPHIC DATA
  // Ethiopian cities — loaded from config in production via useConfig()
  // ============================================================================
  CITIES: [
    'Addis Ababa', 'Adama', 'Bahir Dar', 'Dire Dawa',
    'Gondar', 'Hawassa', 'Jimma', 'Mekelle', 'Shashamane',
  ],

  // ============================================================================
  // ROUTE MAP
  // URL path constants — these rarely change but are centralized for consistency
  // ============================================================================
  ROUTES: {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    LISTINGS: '/listings',
    SEARCH: '/search',
    GUEST_DASHBOARD: '/guest/dashboard',
    GUEST_BOOKINGS: '/guest/bookings',
    GUEST_FAVORITES: '/guest/favorites',
    GUEST_PROFILE: '/guest/profile',
    HOST_DASHBOARD: '/host/dashboard',
    HOST_LISTINGS: '/host/my-listings',
    HOST_LISTINGS_CREATE: '/host/listings/create',
    HOST_BOOKINGS: '/host/bookings',
    HOST_WITHDRAWALS: '/host/withdrawals',
    ADMIN_DASHBOARD: '/admin/dashboard',
    ADMIN_USERS: '/admin/users',
    ADMIN_LISTINGS: '/admin/listings',
    ADMIN_PAYMENTS: '/admin/payments',
    ADMIN_WITHDRAWALS: '/admin/withdrawals',
    ADMIN_REPORTS: '/admin/reports',
  },
};

export default constants;