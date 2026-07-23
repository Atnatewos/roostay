// packages/services/booking.service.js
// Booking service - handles reservation creation, availability checks, status management, and automated expiry
// Supports both short-term (nightly) and long-term (monthly) bookings
// Implements atomic booking + payment creation to prevent race conditions
// All pricing calculations delegated to the centralized pricing.service.js
// Triggers review prompt notification when booking is marked as completed
// All database operations use parameterized queries
// Author: Theron

const { query, queryOne, beginTransaction, commitTransaction, rollbackTransaction } = require('../database');
const pricingService = require('./pricing.service');
const notificationService = require('./notification.service');
const { NotFoundError, ValidationError, ConflictError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');
const events = require('../utils/events');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    features: {
      bookingMinAdvanceHours: 2,
      bookingMaxAdvanceDays: 365,
      shortTermMinNights: 1,
      shortTermMaxNights: 30,
      longTermMinMonths: 1,
      longTermMaxMonths: 24,
      reviewPromptDelayDays: 3,
    },
    payment: {
      paymentTimeoutMinutes: 30,
      currency: 'ETB',
    },
  };
}

const bookingService = {
  /**
   * Creates a new booking with payment information in a single atomic transaction.
   * Validates availability, calculates pricing via pricing.service.js,
   * prevents double booking, and creates payment record.
   *
   * @param {string} guestId     - The guest user ID
   * @param {Object} bookingData - Booking details with payment info
   * @returns {Promise<Object>} Created booking with payment and pricing breakdown
   */
  async createBooking(guestId, bookingData) {
    const {
      listingId,
      checkInDate,
      checkOutDate,
      guestCount,
      bookingType,
      specialRequests,
      paymentMethod,
      transactionNumber,
      proofNotes,
    } = bookingData;

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const now = new Date();

    if (checkIn <= now) {
      throw new ValidationError('Check-in date must be in the future.');
    }

    if (checkOut <= checkIn) {
      throw new ValidationError('Check-out date must be after check-in date.');
    }

    // Check advance booking limits from config
    const minAdvanceMs = (config.features.bookingMinAdvanceHours || 2) * 60 * 60 * 1000;
    if (checkIn.getTime() - now.getTime() < minAdvanceMs) {
      throw new ValidationError(
        `Bookings must be made at least ${config.features.bookingMinAdvanceHours} hours in advance.`
      );
    }

    // Fetch listing
    const listing = await queryOne(
      'SELECT * FROM listings WHERE id = $1 AND is_active = true AND is_approved = true',
      [listingId]
    );

    if (!listing) {
      throw new NotFoundError('Listing not found or not available for booking.');
    }

    // Verify listing supports this booking type
    if (listing.listing_type !== 'both' && listing.listing_type !== bookingType) {
      throw new ValidationError(
        `This listing does not support ${bookingType.replace('_', ' ')} bookings.`
      );
    }

    // Check if guest is trying to book their own listing
    if (listing.host_id === guestId) {
      throw new ValidationError('You cannot book your own listing.');
    }

    // Check guest capacity
    if (guestCount > listing.max_guests) {
      throw new ValidationError(
        `This listing can accommodate a maximum of ${listing.max_guests} guests.`
      );
    }

    // Calculate pricing via centralized pricing service
    const totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (bookingType === 'short_term') {
      if (totalNights < (config.features.shortTermMinNights || 1)) {
        throw new ValidationError(
          `Minimum stay is ${config.features.shortTermMinNights} night(s).`
        );
      }
      if (totalNights > (config.features.shortTermMaxNights || 30)) {
        throw new ValidationError(
          `Maximum stay is ${config.features.shortTermMaxNights} nights.`
        );
      }
    } else {
      const totalMonths = Math.ceil(totalNights / 30);
      if (totalMonths < (config.features.longTermMinMonths || 1)) {
        throw new ValidationError(
          `Minimum stay is ${config.features.longTermMinMonths} month(s).`
        );
      }
      if (totalMonths > (config.features.longTermMaxMonths || 24)) {
        throw new ValidationError(
          `Maximum stay is ${config.features.longTermMaxMonths} months.`
        );
      }
    }

    const pricing = pricingService.calculatePricing({
      bookingType,
      nights: totalNights,
      pricePerNight: parseFloat(listing.price_per_night) || 0,
      pricePerMonth: parseFloat(listing.price_per_month) || 0,
      cleaningFee: parseFloat(listing.cleaning_fee) || 0,
      securityDeposit: parseFloat(listing.security_deposit) || 0,
    });

    const paymentTimeoutMinutes = config.payment.paymentTimeoutMinutes || 30;
    const paymentExpiresAt = new Date(Date.now() + paymentTimeoutMinutes * 60 * 1000);

    const client = await beginTransaction();

    try {
      // Check date availability within transaction
      const dateOverlap = await client.query(
        `SELECT COUNT(*) as overlap FROM listing_availability
         WHERE listing_id = $1
         AND date >= $2 AND date < $3
         AND status = 'booked'`,
        [listingId, checkInDate, checkOutDate]
      );

      if (parseInt(dateOverlap.rows[0].overlap, 10) > 0) {
        throw new ConflictError(
          'The selected dates are not available. Please choose different dates.'
        );
      }

      // Check booking conflicts
      const bookingOverlap = await client.query(
        `SELECT id FROM bookings
         WHERE listing_id = $1
         AND status IN ('pending', 'confirmed')
         AND check_in_date < $3 AND check_out_date > $2`,
        [listingId, checkInDate, checkOutDate]
      );

      if (bookingOverlap.rows.length > 0) {
        throw new ConflictError(
          'These dates conflict with an existing booking. Please choose different dates.'
        );
      }

      // Create the booking
      const booking = await client.query(
        `INSERT INTO bookings (
           listing_id, guest_id, host_id, booking_type,
           check_in_date, check_out_date, guest_count,
           status, base_amount, cleaning_fee, service_fee,
           security_deposit, discount_amount, total_amount,
           special_requests, payment_expires_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          listingId,
          guestId,
          listing.host_id,
          bookingType,
          checkInDate,
          checkOutDate,
          guestCount,
          'pending',
          pricing.baseAmount,
          pricing.cleaningFee,
          pricing.serviceFee,
          pricing.securityDeposit,
          pricing.discountAmount,
          pricing.totalAmount,
          specialRequests || null,
          paymentExpiresAt,
        ]
      );

      // Mark dates as booked
      const dates = [];
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
      }

      for (const date of dates) {
        await client.query(
          `INSERT INTO listing_availability (listing_id, date, status)
           VALUES ($1, $2, 'booked')
           ON CONFLICT (listing_id, date)
           DO UPDATE SET status = 'booked'`,
          [listingId, date]
        );
      }

      // Create payment record
      const payment = await client.query(
        `INSERT INTO payments (
           booking_id, user_id, amount, currency, payment_method,
           transaction_reference, proof_notes, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          booking.rows[0].id,
          guestId,
          pricing.totalAmount,
          pricing.currency,
          paymentMethod,
          transactionNumber,
          proofNotes || null,
          'processing',
        ]
      );

      await commitTransaction(client);

      logger.info('Booking created with payment', {
        bookingId: booking.rows[0].id,
        paymentId: payment.rows[0].id,
        listingId,
        guestId,
        bookingType,
        totalAmount: pricing.totalAmount,
        transactionNumber,
        paymentExpiresAt: paymentExpiresAt.toISOString(),
      });

      events.bookingCreated(booking.rows[0], guestId);

      return {
        booking: booking.rows[0],
        payment: payment.rows[0],
        pricing: {
          baseAmount: pricing.baseAmount,
          cleaningFee: pricing.cleaningFee,
          serviceFee: pricing.serviceFee,
          securityDeposit: pricing.securityDeposit,
          discountAmount: pricing.discountAmount,
          totalAmount: pricing.totalAmount,
          currency: pricing.currency,
        },
        paymentTimeout: {
          expiresAt: paymentExpiresAt.toISOString(),
          minutes: paymentTimeoutMinutes,
        },
      };
    } catch (error) {
      await rollbackTransaction(client);
      throw error;
    }
  },

  /**
   * Retrieves a booking by ID with full details.
   * Verifies the requester is the guest, host, or admin.
   *
   * @param {string} bookingId - The booking ID
   * @param {string} userId    - The requesting user ID
   * @param {string} userRole  - The requesting user role
   * @returns {Promise<Object>} Full booking details
   */
  async getBookingById(bookingId, userId, userRole) {
    const booking = await queryOne(
      `SELECT b.*, l.title as listing_title, l.street_address, l.city,
              gu.first_name as guest_first_name, gu.last_name as guest_last_name,
              hu.first_name as host_first_name, hu.last_name as host_last_name
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users gu ON b.guest_id = gu.id
       JOIN users hu ON b.host_id = hu.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (!booking) {
      throw new NotFoundError('Booking not found.');
    }

    if (booking.guest_id !== userId && booking.host_id !== userId && userRole !== 'admin') {
      throw new ForbiddenError('You do not have permission to view this booking.');
    }

    return booking;
  },

  /**
   * Updates the status of a booking.
   * Enforces valid status transitions based on current status and user role.
   * When a booking is marked as completed, triggers a review prompt notification
   * to the guest encouraging them to leave a review.
   *
   * @param {string} bookingId           - The booking ID
   * @param {string} userId              - The requesting user ID
   * @param {string} userRole            - The requesting user role
   * @param {string} newStatus           - The new booking status
   * @param {string} [cancellationReason] - Reason for cancellation
   * @returns {Promise<Object>} Updated booking
   */
  async updateBookingStatus(bookingId, userId, userRole, newStatus, cancellationReason) {
    const booking = await queryOne('SELECT * FROM bookings WHERE id = $1', [bookingId]);

    if (!booking) {
      throw new NotFoundError('Booking not found.');
    }

    // Define valid status transitions
    const validTransitions = {
      pending: {
        confirmed: ['host', 'admin'],
        cancelled: ['guest', 'admin'],
        rejected: ['host', 'admin'],
        expired: ['system'],
      },
      confirmed: {
        cancelled: ['guest', 'host', 'admin'],
        completed: ['host', 'admin'],
      },
      cancelled: {},
      completed: {},
      rejected: {},
      expired: {},
    };

    const allowedRoles = validTransitions[booking.status]?.[newStatus];

    if (!allowedRoles) {
      throw new ValidationError(
        `Cannot change booking status from "${booking.status}" to "${newStatus}".`
      );
    }

    if (!allowedRoles.includes('system') && !allowedRoles.includes(userRole)) {
      throw new ForbiddenError(
        `You do not have permission to ${newStatus} this booking.`
      );
    }

    if (userRole === 'host' && booking.host_id !== userId && userRole !== 'admin') {
      throw new ForbiddenError('You can only manage bookings for your own listings.');
    }

    if (userRole === 'guest' && booking.guest_id !== userId) {
      throw new ForbiddenError('You can only manage your own bookings.');
    }

    const updates = {
      status: newStatus,
      updated_at: new Date(),
    };

    if (newStatus === 'cancelled') {
      updates.cancelled_by = userId;
      updates.cancelled_at = new Date();
      updates.cancellation_reason = cancellationReason || null;
    }

    if (newStatus === 'confirmed') {
      updates.confirmed_at = new Date();
    }

    if (newStatus === 'completed') {
      updates.completed_at = new Date();
    }

    // Build dynamic update query
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    params.push(bookingId);

    const updated = await queryOne(
      `UPDATE bookings SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    // Release dates if cancelled, rejected, or expired
    if (newStatus === 'cancelled' || newStatus === 'rejected' || newStatus === 'expired') {
      await query(
        `UPDATE listing_availability SET status = 'available'
         WHERE listing_id = $1 AND date >= $2 AND date < $3`,
        [booking.listing_id, booking.check_in_date, booking.check_out_date]
      );

      await query(
        `UPDATE payments SET status = 'cancelled', failure_reason = $1 
         WHERE booking_id = $2 AND status = 'processing'`,
        [`Booking ${newStatus}`, bookingId]
      );

      events.bookingCancelled(booking, userId, cancellationReason);
    }

    if (newStatus === 'confirmed') {
      events.bookingConfirmed(booking, userId);
    }

    if (newStatus === 'completed') {
      events.bookingCompleted(booking, userId);

      // =========================================================================
      // REVIEW PROMPT NOTIFICATION
      // When a booking is marked as completed, schedule a review prompt
      // notification to be delivered after the configurable delay period.
      // This encourages guests to leave reviews, building trust on the platform.
      // =========================================================================
      const reviewDelayDays = config.features.reviewPromptDelayDays || 3;

      // Build the listing link for the review page
      const reviewLink = `/guest/bookings/${bookingId}`;

      // Create the notification immediately — the delay is handled
      // by the notification's created_at timestamp relative to when
      // the guest checks their notifications
      notificationService.createNotification(
        booking.guest_id,
        'review_prompt',
        'How was your stay?',
        `We hope you enjoyed your stay! Please take a moment to leave a review — your feedback helps other travelers.`,
        reviewLink,
        {
          bookingId: booking.id,
          listingId: booking.listing_id,
          hostId: booking.host_id,
          reviewDelayDays,
        }
      );

      logger.info('Review prompt notification created for completed booking', {
        bookingId: booking.id,
        guestId: booking.guest_id,
        listingId: booking.listing_id,
      });
    }

    logger.info('Booking status updated', {
      bookingId,
      oldStatus: booking.status,
      newStatus,
      userId,
    });

    return updated;
  },

  /**
   * Expires unpaid bookings that have exceeded their payment timeout.
   *
   * @returns {Promise<Object>} Number of expired bookings
   */
  async expireUnpaidBookings() {
    const now = new Date();

    const expiredBookings = await query(
      `SELECT id, listing_id, check_in_date, check_out_date 
       FROM bookings 
       WHERE status = 'pending' 
       AND payment_expires_at IS NOT NULL 
       AND payment_expires_at < $1`,
      [now]
    );

    if (expiredBookings.rows.length === 0) {
      return { expired: 0 };
    }

    logger.info('Found expired unpaid bookings', {
      count: expiredBookings.rows.length,
    });

    let expiredCount = 0;

    for (const booking of expiredBookings.rows) {
      try {
        await query(
          `UPDATE bookings SET status = 'expired', updated_at = NOW() WHERE id = $1`,
          [booking.id]
        );

        await query(
          `UPDATE listing_availability SET status = 'available'
           WHERE listing_id = $1 AND date >= $2 AND date < $3`,
          [booking.listing_id, booking.check_in_date, booking.check_out_date]
        );

        await query(
          `UPDATE payments SET status = 'cancelled', failure_reason = 'Payment timeout expired'
           WHERE booking_id = $1 AND status = 'processing'`,
          [booking.id]
        );

        expiredCount++;
        events.bookingExpired(booking);

        logger.info('Booking expired due to payment timeout', {
          bookingId: booking.id,
          listingId: booking.listing_id,
        });
      } catch (error) {
        logger.error('Failed to expire booking', {
          bookingId: booking.id,
          error: error.message,
        });
      }
    }

    return { expired: expiredCount };
  },

  /**
   * Gets bookings for a user (as guest or host).
   *
   * @param {string} userId  - The user ID
   * @param {string} role    - 'guest' or 'host'
   * @param {Object} options - Filter and pagination options
   * @returns {Promise<Object>} Paginated booking list
   */
  async getUserBookings(userId, role, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;

    const idField = role === 'guest' ? 'guest_id' : 'host_id';

    let whereClause = `WHERE b.${idField} = $1`;
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM bookings b ${whereClause}`,
      params
    );

    params.push(limit);
    params.push(offset);

    const bookings = await query(
      `SELECT b.*, l.title as listing_title, l.street_address, l.city,
              l.price_per_night, l.price_per_month
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return {
      bookings: bookings.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },

  /**
   * Checks availability for a listing on given dates.
   *
   * @param {string} listingId    - The listing ID
   * @param {string} checkInDate  - Check-in date
   * @param {string} checkOutDate - Check-out date
   * @returns {Promise<Object>} Availability status
   */
  async checkAvailability(listingId, checkInDate, checkOutDate) {
    const listing = await queryOne(
      'SELECT id, min_nights, max_nights FROM listings WHERE id = $1 AND is_active = true',
      [listingId]
    );

    if (!listing) {
      throw new NotFoundError('Listing not found.');
    }

    const blockedDates = await query(
      `SELECT date FROM listing_availability
       WHERE listing_id = $1 AND date >= $2 AND date < $3 AND status IN ('booked', 'blocked')`,
      [listingId, checkInDate, checkOutDate]
    );

    const conflictingBookings = await query(
      `SELECT id, check_in_date, check_out_date, status
       FROM bookings
       WHERE listing_id = $1 AND status IN ('pending', 'confirmed')
       AND check_in_date < $3 AND check_out_date > $2`,
      [listingId, checkInDate, checkOutDate]
    );

    return {
      available: blockedDates.rows.length === 0 && conflictingBookings.rows.length === 0,
      blockedDates: blockedDates.rows.map((d) => d.date),
      conflictingBookings: conflictingBookings.rows,
    };
  },
};

module.exports = bookingService;