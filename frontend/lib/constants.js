// frontend/lib/constants.js
// Centralized frontend constants and configuration
// All values are driven by environment variables (NEXT_PUBLIC_*) or sensible defaults
// Booking-related configuration mirrors the backend payment.config.json
// Public payment info (bank details, shortcodes) is stored directly — NOT secrets
// Author: Theron

const constants = {
  // ============================================================================
  // APPLICATION CONFIGURATION
  // ============================================================================
  API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'ROOSTAY',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  APP_DESCRIPTION: 'Find your perfect stay in Ethiopia.',

  // ============================================================================
  // PAGINATION & LIMITS
  // ============================================================================
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 50,
  MAX_IMAGE_SIZE_MB: 5,
  MAX_IMAGES_PER_LISTING: 15,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],

  // ============================================================================
  // CURRENCY
  // ============================================================================
  CURRENCY: 'ETB',
  CURRENCY_SYMBOL: 'Br',

  // ============================================================================
  // BOOKING DEFAULTS
  // ============================================================================
  MIN_NIGHTS_DEFAULT: 1,
  MAX_NIGHTS_DEFAULT: 30,

  // ============================================================================
  // GEOGRAPHIC DATA
  // ============================================================================
  CITIES: [
    'Addis Ababa', 'Adama', 'Bahir Dar', 'Dire Dawa',
    'Gondar', 'Hawassa', 'Jimma', 'Mekelle', 'Shashamane',
  ],

  // ============================================================================
  // LISTING OPTIONS
  // ============================================================================
  PROPERTY_TYPES: [
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'villa', label: 'Villa' },
    { value: 'condo', label: 'Condo' },
    { value: 'guest_house', label: 'Guest House' },
    { value: 'shared_room', label: 'Shared Room' },
    { value: 'serviced_apartment', label: 'Serviced Apartment' },
  ],

  LISTING_TYPES: [
    { value: 'short_term', label: 'Short Term' },
    { value: 'long_term', label: 'Long Term' },
    { value: 'both', label: 'Both' },
  ],

  CANCELLATION_POLICIES: [
    { value: 'flexible', label: 'Flexible' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'strict', label: 'Strict' },
  ],

  // ============================================================================
  // STATUS LABELS & COLORS
  // ============================================================================
  BOOKING_STATUSES: {
    pending: { label: 'Pending', color: '#F59E0B' },
    confirmed: { label: 'Confirmed', color: '#10B981' },
    cancelled: { label: 'Cancelled', color: '#EF4444' },
    completed: { label: 'Completed', color: '#3B82F6' },
    rejected: { label: 'Rejected', color: '#EF4444' },
    expired: { label: 'Expired', color: '#6B7280' },
  },

  PAYMENT_STATUSES: {
    pending: { label: 'Pending', color: '#F59E0B' },
    processing: { label: 'Processing', color: '#3B82F6' },
    completed: { label: 'Completed', color: '#10B981' },
    failed: { label: 'Failed', color: '#EF4444' },
    refunded: { label: 'Refunded', color: '#8B5CF6' },
    cancelled: { label: 'Cancelled', color: '#6B7280' },
    pending_review: { label: 'Pending Review', color: '#F59E0B' },
  },

  // ============================================================================
  // ROUTE MAP
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
    HOST_LISTINGS: '/host/listings',
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

  // ============================================================================
  // BOOKING CONFIGURATION
  // Mirrors packages/config/payment.config.json for frontend use
  // Public payment info (bank details, shortcodes) stored directly — NOT secrets
  // These are displayed to guests so they can make payments
  // ============================================================================
  BOOKING_CONFIG: {
    PAYMENT_TIMEOUT_MINUTES: 30,

    // Public bank transfer details — guests need these to make payments
    BANK_TRANSFER: {
      BANK_NAME: 'Commercial Bank of Ethiopia',
      ACCOUNT_NUMBER: '1000457856',
      ACCOUNT_HOLDER: 'ROOSTAY PLC',
    },

    // Public Telebirr details — guests need these to make payments
    TELEBIRR: {
      SHORTCODE: '123456',
      MERCHANT_NAME: 'ROOSTAY',
    },

    // All user-facing messages — change here to update across the entire app
    MESSAGES: {
      BOOKING_CREATED: 'Booking Created Successfully!',
      BOOKING_AWAITING_CONFIRMATION:
        'Your booking has been submitted and is awaiting confirmation. We will notify you once your payment is verified.',
      BOOKING_REFERENCE_LABEL: 'Booking Reference',
      PAYMENT_EXPIRED:
        'Payment window has expired. Please close this modal and try again.',
      COMPLETE_PAYMENT_WITHIN: 'Complete your payment within:',
      ENTER_TRANSACTION_HINT:
        'After sending payment, enter the reference number from your confirmation SMS.',
      TRANSACTION_VERIFIED:
        'Transaction number verified — not previously used.',
      TRANSACTION_INVALID: 'This transaction number has already been used.',
      TRANSACTION_REQUIRED:
        'Please enter a valid transaction reference number.',
      TRANSACTION_MUST_VERIFY:
        'Please verify your transaction number before submitting.',
      VALIDATION_FAILED:
        'Failed to validate transaction number. Please try again.',
      BOOKING_FAILED: 'Failed to create booking. Please try again.',
      ADDITIONAL_NOTES_LABEL: 'Additional Notes (optional)',
      ADDITIONAL_NOTES_PLACEHOLDER:
        'Any additional information about your payment...',
      SUBMIT_AND_BOOK: 'Submit & Book',
      CANCEL: 'Cancel',
      VIEW_MY_BOOKINGS: 'View My Bookings',
      SELECT_PAYMENT_METHOD: 'Select Payment Method',
      BANK_TRANSFER: 'Bank Transfer',
      TELEBIRR: 'Telebirr',
      BANK_TRANSFER_DETAILS: 'Bank Transfer Details',
      TELEBIRR_DETAILS: 'Telebirr Payment Details',
      BANK_LABEL: 'Bank',
      ACCOUNT_NUMBER_LABEL: 'Account Number',
      ACCOUNT_HOLDER_LABEL: 'Account Holder',
      AMOUNT_TO_TRANSFER: 'Amount to Transfer',
      MERCHANT_LABEL: 'Merchant',
      SHORTCODE_LABEL: 'Shortcode',
      AMOUNT_LABEL: 'Amount',
      COPIED: 'Copied!',
      COPY: 'Copy',
      TRANSACTION_REFERENCE_NUMBER: 'Transaction Reference Number',
      TELEBIRR_TRANSACTION_ID: 'Telebirr Transaction ID',
      VERIFY: 'Verify',
      IMPORTANT_NOTICE:
        'Complete the payment first, then enter the transaction number. Your booking will be confirmed after payment verification.',
      TRANSACTION_PLACEHOLDER_BANK: 'e.g., FT1234567890',
      TRANSACTION_PLACEHOLDER_TELEBIRR: 'e.g., TB123456789',
    },
  },
};

export default constants;