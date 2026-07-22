// packages/utils/events.js
// Structured event tracking system for ROOSTAY observability
// All significant business actions emit events that can be:
// - Logged to console/stderr for debugging
// - Sent to analytics/monitoring services (future: Datadog, Sentry, Mixpanel)
// - Stored in database for audit trails
// - Used as training data for future AI/ML models
// Author: Theron

const logger = require('./logger');

/**
 * Emits a structured event with timestamp, event type, and payload.
 * All events are sanitized to remove sensitive data before logging.
 * This is the foundation for future AI-powered features:
 * - Smart pricing recommendations
 * - Fraud detection patterns
 * - User behavior analysis
 * - Search ranking optimization
 *
 * @param {string} eventType - The event category and action (e.g., 'booking.created')
 * @param {Object} payload   - Event-specific data
 */
function emit(eventType, payload = {}) {
  const event = {
    event: eventType,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    data: sanitizeEventPayload(payload),
  };

  // Log to structured logger for ELK/Splunk/Datadog ingestion
  logger.info(`EVENT: ${eventType}`, event);

  // Future: Send to analytics pipeline
  // analytics.track(eventType, event);

  // Future: Store in events table for ML training
  // await query('INSERT INTO platform_events (event_type, payload, created_at) VALUES ($1, $2, NOW())', [eventType, event]);
}

/**
 * Removes sensitive fields from event payloads before logging.
 * Ensures PII (Personally Identifiable Information) never leaks into logs.
 *
 * @param {Object} payload - Raw event payload
 * @returns {Object} Sanitized payload
 */
function sanitizeEventPayload(payload) {
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'creditCard',
    'ssn',
    'idNumber',
    'idFrontImageUrl',
    'idBackImageUrl',
    'transactionNumber',
  ];

  const sanitized = {};

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk));

    if (isSensitive && typeof value === 'string') {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeEventPayload(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// BOOKING EVENTS
// ============================================================================

/**
 * Emitted when a new booking is created.
 *
 * @param {Object} booking  - The created booking record
 * @param {string} guestId  - The guest user ID
 */
function bookingCreated(booking, guestId) {
  emit('booking.created', {
    bookingId: booking.id,
    listingId: booking.listing_id,
    hostId: booking.host_id,
    guestId,
    bookingType: booking.booking_type,
    checkIn: booking.check_in_date,
    checkOut: booking.check_out_date,
    guestCount: booking.guest_count,
    totalAmount: booking.total_amount,
    currency: booking.currency || 'ETB',
    status: booking.status,
  });
}

/**
 * Emitted when a booking is confirmed by the host.
 *
 * @param {Object} booking - The booking record
 * @param {string} userId  - The user who confirmed
 */
function bookingConfirmed(booking, userId) {
  emit('booking.confirmed', {
    bookingId: booking.id,
    listingId: booking.listing_id,
    hostId: booking.host_id,
    guestId: booking.guest_id,
    confirmedBy: userId,
    totalAmount: booking.total_amount,
  });
}

/**
 * Emitted when a booking is cancelled.
 *
 * @param {Object} booking - The booking record
 * @param {string} userId  - The user who cancelled
 * @param {string} reason  - Cancellation reason
 */
function bookingCancelled(booking, userId, reason) {
  emit('booking.cancelled', {
    bookingId: booking.id,
    listingId: booking.listing_id,
    cancelledBy: userId,
    reason: reason || 'No reason provided',
    wasConfirmed: booking.status === 'confirmed',
  });
}

/**
 * Emitted when a booking is marked as completed.
 *
 * @param {Object} booking - The booking record
 * @param {string} userId  - The user who marked it complete
 */
function bookingCompleted(booking, userId) {
  emit('booking.completed', {
    bookingId: booking.id,
    listingId: booking.listing_id,
    hostId: booking.host_id,
    guestId: booking.guest_id,
    completedBy: userId,
    totalAmount: booking.total_amount,
  });
}

/**
 * Emitted when a booking expires due to payment timeout.
 *
 * @param {Object} booking - The booking record
 */
function bookingExpired(booking) {
  emit('booking.expired', {
    bookingId: booking.id,
    listingId: booking.listing_id,
    guestId: booking.guest_id,
    totalAmount: booking.total_amount,
  });
}

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

/**
 * Emitted when a payment is verified by an admin.
 *
 * @param {Object} payment - The payment record
 * @param {string} adminId - The admin who verified
 */
function paymentVerified(payment, adminId) {
  emit('payment.verified', {
    paymentId: payment.id,
    bookingId: payment.booking_id,
    amount: payment.amount,
    method: payment.payment_method,
    verifiedBy: adminId,
  });
}

/**
 * Emitted when a payment is rejected.
 *
 * @param {Object} payment - The payment record
 * @param {string} adminId - The admin who rejected
 * @param {string} reason  - Rejection reason
 */
function paymentRejected(payment, adminId, reason) {
  emit('payment.rejected', {
    paymentId: payment.id,
    bookingId: payment.booking_id,
    amount: payment.amount,
    rejectedBy: adminId,
    reason: reason || 'No reason provided',
  });
}

// ============================================================================
// LISTING EVENTS
// ============================================================================

/**
 * Emitted when a listing is viewed.
 *
 * @param {string} listingId - The listing ID
 * @param {string} [userId]  - The viewing user ID (null if anonymous)
 */
function listingViewed(listingId, userId) {
  emit('listing.viewed', {
    listingId,
    userId: userId || null,
    isAuthenticated: !!userId,
  });
}

/**
 * Emitted when a listing is created.
 *
 * @param {Object} listing - The created listing
 * @param {string} hostId  - The host user ID
 */
function listingCreated(listing, hostId) {
  emit('listing.created', {
    listingId: listing.id,
    hostId,
    listingType: listing.listing_type,
    propertyType: listing.property_type,
    city: listing.city,
    pricePerNight: listing.price_per_night,
    pricePerMonth: listing.price_per_month,
  });
}

// ============================================================================
// SEARCH EVENTS
// ============================================================================

/**
 * Emitted when a user performs a search.
 *
 * @param {Object} query   - Search parameters
 * @param {number} results - Number of results returned
 * @param {string} [userId] - The searching user ID
 */
function searchPerformed(query, results, userId) {
  emit('search.performed', {
    query: {
      city: query.city || null,
      listingType: query.listingType || null,
      search: query.search || null,
      guests: query.guests || null,
      minPrice: query.minPrice || null,
      maxPrice: query.maxPrice || null,
    },
    resultCount: results,
    userId: userId || null,
  });
}

// ============================================================================
// USER EVENTS
// ============================================================================

/**
 * Emitted when a user registers.
 *
 * @param {Object} user - The created user
 */
function userRegistered(user) {
  emit('user.registered', {
    userId: user.id,
    role: user.role,
  });
}

/**
 * Emitted when a user logs in.
 *
 * @param {Object} user - The authenticated user
 */
function userLoggedIn(user) {
  emit('user.logged_in', {
    userId: user.id,
    role: user.role,
  });
}

/**
 * Emitted when a user becomes a host.
 *
 * @param {string} userId - The user ID
 */
function userBecameHost(userId) {
  emit('user.became_host', {
    userId,
  });
}

// ============================================================================
// ERROR EVENTS
// ============================================================================

/**
 * Emitted when a significant error occurs.
 * Used for monitoring, alerting, and debugging.
 *
 * @param {Error}  error   - The error object
 * @param {Object} context - Additional context about the error
 */
function errorOccurred(error, context = {}) {
  emit('error.occurred', {
    errorMessage: error.message,
    errorName: error.name,
    errorCode: error.code || error.errorCode || null,
    statusCode: error.statusCode || null,
    context,
  });
}

module.exports = {
  // Core
  emit,

  // Booking
  bookingCreated,
  bookingConfirmed,
  bookingCancelled,
  bookingCompleted,
  bookingExpired,

  // Payment
  paymentVerified,
  paymentRejected,

  // Listing
  listingViewed,
  listingCreated,

  // Search
  searchPerformed,

  // User
  userRegistered,
  userLoggedIn,
  userBecameHost,

  // Error
  errorOccurred,
};