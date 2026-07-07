// packages/services/withdrawal.service.js
// Withdrawal service - handles host payout requests
// Supports bank transfer and Telebirr withdrawal methods
// Admin verification required for processing

const { query, queryOne } = require('../database');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    payment: {
      currency: 'ETB',
      withdrawal: {
        minimumAmount: 500,
        maximumAmount: 100000,
        processingTimeDays: 3,
        methods: ['bank_transfer', 'telebirr'],
        feePercent: 0,
        feeFixed: 0,
      },
    },
  };
}

const withdrawalService = {
  /**
   * Creates a withdrawal request for a host.
   * Calculates fees and validates available balance.
   *
   * @param {string} userId - The host user ID
   * @param {Object} withdrawalData - Withdrawal details { amount, method, bankName, accountNumber, accountHolder }
   * @returns {Promise<Object>} Created withdrawal request
   */
  async requestWithdrawal(userId, withdrawalData) {
    const { amount, method, bankName, accountNumber, accountHolder } = withdrawalData;

    // Validate amount
    const minAmount = config.payment.withdrawal.minimumAmount || 500;
    const maxAmount = config.payment.withdrawal.maximumAmount || 100000;

    if (amount < minAmount) {
      throw new ValidationError(
        `Minimum withdrawal amount is ${minAmount} ${config.payment.currency}.`
      );
    }

    if (amount > maxAmount) {
      throw new ValidationError(
        `Maximum withdrawal amount is ${maxAmount} ${config.payment.currency}.`
      );
    }

    // Validate method
    const allowedMethods = config.payment.withdrawal.methods || ['bank_transfer'];
    if (!allowedMethods.includes(method)) {
      throw new ValidationError(
        `Withdrawal method "${method}" is not supported. Available methods: ${allowedMethods.join(', ')}.`
      );
    }

    // Validate bank details for bank transfer
    if (method === 'bank_transfer') {
      if (!bankName) throw new ValidationError('Bank name is required for bank transfer.');
      if (!accountNumber) throw new ValidationError('Account number is required for bank transfer.');
      if (!accountHolder) throw new ValidationError('Account holder name is required for bank transfer.');
    }

    // Calculate fees
    const feePercent = config.payment.withdrawal.feePercent || 0;
    const feeFixed = config.payment.withdrawal.feeFixed || 0;
    const feeAmount = Math.round((amount * feePercent / 100) + feeFixed);
    const netAmount = amount - feeAmount;

    if (netAmount <= 0) {
      throw new ValidationError('Withdrawal amount is too low after fees.');
    }

    // Check available balance (simplified - sum of completed booking payments for host)
    const earnings = await queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) as total_earned
       FROM bookings
       WHERE host_id = $1 AND status = 'completed'`,
      [userId]
    );

    const withdrawals = await queryOne(
      `SELECT COALESCE(SUM(net_amount), 0) as total_withdrawn
       FROM withdrawals
       WHERE user_id = $1 AND status IN ('pending', 'processing', 'completed')`,
      [userId]
    );

    const availableBalance = parseFloat(earnings.total_earned) - parseFloat(withdrawals.total_withdrawn);

    if (amount > availableBalance) {
      throw new ValidationError(
        `Insufficient balance. Available: ${availableBalance} ${config.payment.currency}.`
      );
    }

    // Create withdrawal
    const withdrawal = await queryOne(
      `INSERT INTO withdrawals (
        user_id, amount, fee_amount, net_amount, currency,
        method, bank_name, account_number, account_holder, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *`,
      [
        userId,
        amount,
        feeAmount,
        netAmount,
        config.payment.currency,
        method,
        bankName || null,
        accountNumber || null,
        accountHolder || null,
      ]
    );

    logger.info('Withdrawal requested', {
      withdrawalId: withdrawal.id,
      userId,
      amount,
      netAmount,
      method,
    });

    return withdrawal;
  },

  /**
   * Processes a withdrawal request (admin only).
   *
   * @param {string} withdrawalId - The withdrawal ID
   * @param {string} adminId - The admin user ID
   * @param {string} action - 'approve' or 'reject'
   * @param {string} [transactionReference] - Reference number for approved withdrawals
   * @param {string} [notes] - Notes for rejection
   * @returns {Promise<Object>} Updated withdrawal
   */
  async processWithdrawal(withdrawalId, adminId, action, transactionReference, notes) {
    const withdrawal = await queryOne(
      'SELECT * FROM withdrawals WHERE id = $1',
      [withdrawalId]
    );

    if (!withdrawal) {
      throw new NotFoundError('Withdrawal request not found.');
    }

    if (withdrawal.status !== 'pending') {
      throw new ValidationError(
        `Cannot ${action} a withdrawal with status "${withdrawal.status}".`
      );
    }

    let newStatus;
    if (action === 'approve') {
      newStatus = 'completed';
    } else if (action === 'reject') {
      newStatus = 'failed';
    } else {
      throw new ValidationError('Invalid action. Use "approve" or "reject".');
    }

    const updated = await queryOne(
      `UPDATE withdrawals
       SET status = $1, processed_by = $2, processed_at = NOW(),
           transaction_reference = $3, notes = $4
       WHERE id = $5
       RETURNING *`,
      [newStatus, adminId, transactionReference || null, notes || null, withdrawalId]
    );

    logger.info(`Withdrawal ${action}d`, {
      withdrawalId,
      adminId,
      userId: withdrawal.user_id,
      amount: withdrawal.net_amount,
    });

    return updated;
  },

  /**
   * Gets withdrawal history for a user.
   *
   * @param {string} userId - The user ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated withdrawal list
   */
  async getUserWithdrawals(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const countResult = await queryOne(
      'SELECT COUNT(*) as total FROM withdrawals WHERE user_id = $1',
      [userId]
    );

    const withdrawals = await query(
      `SELECT * FROM withdrawals WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      withdrawals: withdrawals.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },

  /**
   * Lists all withdrawals (admin only).
   *
   * @param {Object} filters - Filter and pagination options
   * @returns {Promise<Object>} Paginated withdrawal list
   */
  async listWithdrawals(filters = {}) {
    const { page = 1, limit = 20, status } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND w.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM withdrawals w ${whereClause}`,
      params
    );

    params.push(limit);
    params.push(offset);

    const withdrawals = await query(
      `SELECT w.*, u.first_name, u.last_name, u.email
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       ${whereClause}
       ORDER BY w.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return {
      withdrawals: withdrawals.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },
};

module.exports = withdrawalService;