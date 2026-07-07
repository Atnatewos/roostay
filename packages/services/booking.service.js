// packages/services/booking.service.js
// Booking service - handles reservation creation, availability checks, and status management
// Supports both short-term (nightly) and long-term (monthly) bookings
// All database operations use parameterized queries

const { query, queryOne, beginTransaction, commitTransaction, rollbackTransaction } = require('../database');
const { NotFoundError, ValidationError, ConflictError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

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
    },
    payment: {
      serviceFeePercent: 5,
      serviceFeeMin: 100,
      serviceFeeMax: 5000,
    },
  };
}

const bookingService = {
  /**
   * Creates a new booking for a listing.
   * Validates availability, calculates pricing, and prevents double booking.
   * Uses database transactions to ensure atomicity.
   *
   * @param {string} guestId - The guest user ID
   * @param {Object} bookingData - Booking details { listingId, checkInDate, checkOutDate, guestCount, bookingType, specialRequests }
   * @returns {Promise<Object>} Created booking with pricing breakdown
   */
  async createBooking(guestId, bookingData) {
    const { listingId, checkInDate, checkOutDate, guestCount, bookingType, specialRequests } = bookingData;

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

    // Check advance booking limits
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

    // Calculate pricing
    let baseAmount, totalNights;
    if (bookingType === 'short_term') {
      totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

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

      baseAmount = parseFloat(listing.price_per_night) * totalNights;
    } else {
      const totalMonths = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24 * 30));

      if (totalMonths < (config.features.longTermMinMonths || 1)) {
        throw new ValidationError(
          `Minimum stay is ${config.features.longTermMinMonths} month(s).`
        );
      }

      baseAmount = parseFloat(listing.price_per_month) * totalMonths;
      totalNights = totalMonths * 30;
    }

    // Calculate service fee
    const serviceFeePercent = config.payment.serviceFeePercent || 5;
    let serviceFee = Math.round(baseAmount * (serviceFeePercent / 100));
    serviceFee = Math.max(serviceFee, config.payment.serviceFeeMin || 0);
    serviceFee = Math.min(serviceFee, config.payment.serviceFeeMax || Infinity);

    const cleaningFee = parseFloat(listing.cleaning_fee) || 0;
    const securityDeposit = parseFloat(listing.security_deposit) || 0;
    const totalAmount = baseAmount + serviceFee + cleaningFee;

    // Use transaction for atomicity
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
          security_deposit, total_amount,
          special_requests
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
          baseAmount,
          cleaningFee,
          serviceFee,
          securityDeposit,
          totalAmount,
          specialRequests || null,
        ]
      );

      // Mark dates as booked in availability
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

      await commitTransaction(client);

      logger.info('Booking created', {
        bookingId: booking.rows[0].id,
        listingId,
        guestId,
        bookingType,
        totalAmount,
      });

      return {
        booking: booking.rows[0],
        pricing: {
          baseAmount,
          cleaningFee,
          serviceFee,
          securityDeposit,
          totalAmount,
          currency: 'ETB',
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
   * @param {string} userId - The requesting user ID
   * @param {string} userRole - The requesting user role
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

    // Verify access permission
    if (booking.guest_id !== userId && booking.host_id !== userId && userRole !== 'admin') {
      throw new ForbiddenError('You do not have permission to view this booking.');
    }

    return booking;
  },

  /**
   * Updates the status of a booking.
   * Enforces valid status transitions based on current status and user role.
   *
   * @param {string} bookingId - The booking ID
   * @param {string} userId - The requesting user ID
   * @param {string} userRole - The requesting user role
   * @param {string} newStatus - The new booking status
   * @param {string} [cancellationReason] - Reason for cancellation
   * @returns {Promise<Object>} Updated booking
   */
  async updateBookingStatus(bookingId, userId, userRole, newStatus, cancellationReason) {
    const booking = await queryOne(
      'SELECT * FROM bookings WHERE id = $1',
      [bookingId]
    );

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

    // Additional host-specific checks
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

    // Release dates if cancelled or rejected
    if (newStatus === 'cancelled' || newStatus === 'rejected') {
      await query(
        `UPDATE listing_availability SET status = 'available'
         WHERE listing_id = $1 AND date >= $2 AND date < $3`,
        [booking.listing_id, booking.check_in_date, booking.check_out_date]
      );
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
   * Gets bookings for a user (as guest or host).
   *
   * @param {string} userId - The user ID
   * @param {string} role - 'guest' or 'host'
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
   * @param {string} listingId - The listing ID
   * @param {string} checkInDate - Check-in date
   * @param {string} checkOutDate - Check-out date
   * @returns {Promise<Object>} Availability status with conflicting bookings
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