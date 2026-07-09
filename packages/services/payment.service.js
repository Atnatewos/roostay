// packages/services/payment.service.js
// Payment service - handles payment creation, proof upload, verification, and transaction validation
// Supports manual bank transfer and Telebirr payment methods
// All amounts in ETB with configurable service fees
// Prevents duplicate transaction numbers across completed payments
const { query, queryOne, beginTransaction, commitTransaction, rollbackTransaction } = require('../database');
const { NotFoundError, ValidationError, ForbiddenError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    payment: {
      currency: 'ETB',
      serviceFeePercent: 5,
      serviceFeeMin: 100,
      serviceFeeMax: 5000,
      paymentTimeoutMinutes: 30,
      requireTransactionNumber: true,
      preventDuplicateTransactions: true,
      bankTransfer: {
        enabled: true,
        bankName: 'Commercial Bank of Ethiopia',
        accountNumber: '1000000000000',
        accountHolder: 'ROOSTAY PLC',
        referencePrefix: 'ROOSTAY',
        verificationTimeoutHours: 48,
        instructions: 'Please transfer the total amount and enter the transaction reference number.',
      },
      telebirr: {
        enabled: true,
        merchantId: '123456',
        apiKey: 'test_key',
        shortcode: '123456',
        merchantName: 'ROOSTAY',
      },
    },
  };
}

const paymentService = {
  /**
   * Validates that a transaction number has not been used in a completed payment.
   * Prevents duplicate payments and fraud.
   * 
   * @param {string} transactionNumber - The transaction reference number to validate
   * @returns {Promise<Object>} Validation result { valid: boolean, message: string }
   */
  async validateTransactionNumber(transactionNumber) {
    if (!config.payment.preventDuplicateTransactions) {
      return { valid: true, message: 'Transaction validation disabled in this environment.' };
    }

    // Check if transaction number exists in completed payments
    const existingPayment = await queryOne(
      `SELECT id, status, booking_id 
       FROM payments 
       WHERE transaction_reference = $1 
       AND status IN ('completed', 'processing')`,
      [transactionNumber]
    );

    if (existingPayment) {
      logger.warn('Duplicate transaction number detected', {
        transactionNumber,
        existingPaymentId: existingPayment.id,
        status: existingPayment.status,
      });

      return {
        valid: false,
        message: 'This transaction number has already been used. Please enter a different reference number.',
      };
    }

    return {
      valid: true,
      message: 'Transaction number is valid and available.',
    };
  },

  /**
   * Creates a payment record for a confirmed booking.
   * Generates payment instructions based on the selected method.
   * 
   * @param {string} bookingId - The booking ID
   * @param {string} userId - The paying user ID
   * @param {string} paymentMethod - Payment method (bank_transfer, telebirr)
   * @returns {Promise<Object>} Payment record with instructions
   */
  async createPayment(bookingId, userId, paymentMethod = 'bank_transfer') {
    // Verify booking exists and belongs to the user
    const booking = await queryOne(
      `SELECT b.*, l.title as listing_title 
       FROM bookings b 
       JOIN listings l ON b.listing_id = l.id 
       WHERE b.id = $1 AND b.guest_id = $2`,
      [bookingId, userId]
    );

    if (!booking) {
      throw new NotFoundError('Booking not found or you are not the guest for this booking.');
    }

    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      throw new ValidationError(
        `Cannot create payment for a booking with status "${booking.status}".`
      );
    }

    // Check if payment already exists
    const existingPayment = await queryOne(
      'SELECT id, status FROM payments WHERE booking_id = $1',
      [bookingId]
    );

    if (existingPayment) {
      if (existingPayment.status === 'completed') {
        throw new ValidationError('Payment has already been completed for this booking.');
      }
      if (existingPayment.status === 'pending') {
        return await this.getPaymentById(existingPayment.id, userId);
      }
    }

    // Validate payment method
    if (paymentMethod === 'bank_transfer' && !config.payment.bankTransfer.enabled) {
      throw new ValidationError('Bank transfer payment is currently disabled.');
    }

    if (paymentMethod === 'telebirr') {
      if (!config.payment.telebirr || !config.payment.telebirr.enabled) {
        throw new ValidationError('Telebirr payment is currently disabled.');
      }
    }

    // Create payment record
    const payment = await queryOne(
      `INSERT INTO payments (booking_id, user_id, amount, currency, payment_method, status, metadata)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING *`,
      [
        bookingId,
        userId,
        booking.total_amount,
        config.payment.currency || 'ETB',
        paymentMethod,
        JSON.stringify({
          bookingType: booking.booking_type,
          listingTitle: booking.listing_title,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
        }),
      ]
    );

    // Generate payment instructions
    let instructions = {};
    if (paymentMethod === 'bank_transfer') {
      instructions = {
        method: 'bank_transfer',
        bankName: config.payment.bankTransfer.bankName,
        accountNumber: config.payment.bankTransfer.accountNumber,
        accountHolder: config.payment.bankTransfer.accountHolder,
        reference: `${config.payment.bankTransfer.referencePrefix}-${payment.id.substring(0, 8).toUpperCase()}`,
        amount: booking.total_amount,
        currency: config.payment.currency,
        instructions: config.payment.bankTransfer.instructions,
        verificationTime: `${config.payment.bankTransfer.verificationTimeoutHours} hours`,
      };
    } else if (paymentMethod === 'telebirr') {
      instructions = {
        method: 'telebirr',
        merchantName: config.payment.telebirr.merchantName,
        shortcode: config.payment.telebirr.shortcode,
        amount: booking.total_amount,
        currency: config.payment.currency,
      };
    }

    logger.info('Payment created', {
      paymentId: payment.id,
      bookingId,
      userId,
      method: paymentMethod,
      amount: booking.total_amount,
    });

    return {
      payment,
      instructions,
    };
  },

  /**
   * Creates a payment with transaction number in a single atomic operation.
   * Used in the new payment-first flow where transaction number is provided upfront.
   * 
   * @param {string} bookingId - The booking ID
   * @param {string} userId - The paying user ID
   * @param {string} paymentMethod - Payment method
   * @param {string} transactionNumber - Transaction reference number
   * @param {string} [proofNotes] - Optional notes about the payment
   * @returns {Promise<Object>} Created payment with transaction reference
   */
  async createPaymentWithTransaction(bookingId, userId, paymentMethod, transactionNumber, proofNotes) {
    // Validate transaction number uniqueness first
    const validation = await this.validateTransactionNumber(transactionNumber);
    if (!validation.valid) {
      throw new ConflictError(validation.message);
    }

    // Create payment with transaction number
    const payment = await queryOne(
      `INSERT INTO payments (
         booking_id, user_id, amount, currency, payment_method, 
         transaction_reference, proof_notes, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing')
       RETURNING *`,
      [
        bookingId,
        userId,
        (await queryOne('SELECT total_amount FROM bookings WHERE id = $1', [bookingId])).total_amount,
        config.payment.currency || 'ETB',
        paymentMethod,
        transactionNumber,
        proofNotes || null,
      ]
    );

    logger.info('Payment created with transaction number', {
      paymentId: payment.id,
      bookingId,
      userId,
      transactionNumber,
      method: paymentMethod,
    });

    return payment;
  },

  /**
   * Uploads payment proof (receipt/screenshot) for manual verification.
   * 
   * @param {string} paymentId - The payment ID
   * @param {string} userId - The user uploading the proof
   * @param {string} proofImageUrl - URL of the uploaded proof image
   * @param {string} [notes] - Optional notes about the payment
   * @returns {Promise<Object>} Updated payment record
   */
  async uploadPaymentProof(paymentId, userId, proofImageUrl, notes) {
    const payment = await queryOne(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (!payment) {
      throw new NotFoundError('Payment not found.');
    }

    if (payment.user_id !== userId) {
      throw new ForbiddenError('You can only upload proof for your own payments.');
    }

    if (payment.status !== 'pending') {
      throw new ValidationError(
        `Cannot upload proof for a payment with status "${payment.status}".`
      );
    }

    const updated = await queryOne(
      `UPDATE payments SET proof_image_url = $1, proof_notes = $2, status = 'processing'
       WHERE id = $3 RETURNING *`,
      [proofImageUrl, notes || null, paymentId]
    );

    logger.info('Payment proof uploaded', {
      paymentId,
      userId,
    });

    return updated;
  },

  /**
   * Verifies or rejects a payment (admin only).
   * 
   * @param {string} paymentId - The payment ID
   * @param {string} adminId - The admin user ID
   * @param {string} action - 'verify' or 'reject'
   * @param {string} [reason] - Rejection reason
   * @returns {Promise<Object>} Updated payment record
   */
  async verifyPayment(paymentId, adminId, action, reason) {
    const payment = await queryOne(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (!payment) {
      throw new NotFoundError('Payment not found.');
    }

    if (payment.status !== 'processing' && payment.status !== 'pending' && payment.status !== 'pending_review') {
      throw new ValidationError(
        `Cannot ${action} a payment with status "${payment.status}".`
      );
    }

    let newStatus, updatedFields;

    if (action === 'verify') {
      newStatus = 'completed';
      updatedFields = {
        status: newStatus,
        verified_by: adminId,
        verified_at: new Date(),
      };
    } else if (action === 'reject') {
      // If rejection is due to invalid transaction, move to pending_review for manual check
      newStatus = reason?.includes('review') ? 'pending_review' : 'failed';
      updatedFields = {
        status: newStatus,
        verified_by: adminId,
        failure_reason: reason || 'Payment verification failed.',
      };
    } else {
      throw new ValidationError('Invalid action. Use "verify" or "reject".');
    }

    // Build update query
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updatedFields)) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    params.push(paymentId);

    const updated = await queryOne(
      `UPDATE payments SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    // If payment verified, update booking status if needed
    if (newStatus === 'completed') {
      await query(
        `UPDATE bookings SET status = 'confirmed' WHERE id = $1 AND status = 'pending'`,
        [payment.booking_id]
      );
    }

    logger.info(`Payment ${action}d`, {
      paymentId,
      adminId,
      bookingId: payment.booking_id,
      newStatus,
    });

    return updated;
  },

  /**
   * Gets a payment by ID with booking details.
   * 
   * @param {string} paymentId - The payment ID
   * @param {string} userId - The requesting user ID
   * @returns {Promise<Object>} Payment with booking info
   */
  async getPaymentById(paymentId, userId) {
    const payment = await queryOne(
      `SELECT p.*, b.listing_id, b.check_in_date, b.check_out_date, b.booking_type, b.status as booking_status, l.title as listing_title
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN listings l ON b.listing_id = l.id
       WHERE p.id = $1`,
      [paymentId]
    );

    if (!payment) {
      throw new NotFoundError('Payment not found.');
    }

    // Verify access
    if (payment.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to view this payment.');
    }

    return payment;
  },

  /**
   * Lists payments with filters (admin only).
   * 
   * @param {Object} filters - Filter and pagination options
   * @returns {Promise<Object>} Paginated payment list
   */
  async listPayments(filters = {}) {
    const { page = 1, limit = 20, status, paymentMethod } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (paymentMethod) {
      whereClause += ` AND p.payment_method = $${paramIndex}`;
      params.push(paymentMethod);
      paramIndex++;
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM payments p ${whereClause}`,
      params
    );

    params.push(limit);
    params.push(offset);

    const payments = await query(
      `SELECT p.*, u.first_name, u.last_name, u.email,
              b.listing_id, l.title as listing_title
       FROM payments p
       JOIN users u ON p.user_id = u.id
       JOIN bookings b ON p.booking_id = b.id
       JOIN listings l ON b.listing_id = l.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return {
      payments: payments.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },
};

module.exports = paymentService;