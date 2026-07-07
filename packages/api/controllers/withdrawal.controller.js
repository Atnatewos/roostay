// packages/api/controllers/withdrawal.controller.js
// Withdrawal controller - handles host payout requests
// Supports withdrawal creation and admin processing

const withdrawalService = require('../../services/withdrawal.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const withdrawalController = {
  /**
   * POST /api/withdrawals
   * Requests a withdrawal (host only).
   * Body: { amount, method?, bankName?, accountNumber?, accountHolder? }
   */
  requestWithdrawal: asyncHandler(async (req, res) => {
    const withdrawal = await withdrawalService.requestWithdrawal(req.user.id, req.body);

    logger.info('Withdrawal requested via API', {
      withdrawalId: withdrawal.id,
      userId: req.user.id,
      amount: withdrawal.amount,
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted. Processing may take a few days.',
      data: { withdrawal },
    });
  }),

  /**
   * GET /api/withdrawals
   * Returns withdrawal history for the authenticated host.
   * Query: { page, limit }
   */
  getUserWithdrawals: asyncHandler(async (req, res) => {
    const result = await withdrawalService.getUserWithdrawals(req.user.id, req.query);

    res.status(200).json({
      success: true,
      data: result.withdrawals,
      pagination: result.pagination,
    });
  }),

  /**
   * GET /api/admin/withdrawals
   * Lists all withdrawal requests (admin only).
   * Query: { page, limit, status }
   */
  listWithdrawals: asyncHandler(async (req, res) => {
    const result = await withdrawalService.listWithdrawals(req.query);

    res.status(200).json({
      success: true,
      data: result.withdrawals,
      pagination: result.pagination,
    });
  }),

  /**
   * PATCH /api/admin/withdrawals/:id/process
   * Approves or rejects a withdrawal (admin only).
   * Body: { action: 'approve'|'reject', transactionReference?, notes? }
   */
  processWithdrawal: asyncHandler(async (req, res) => {
    const { action, transactionReference, notes } = req.body;

    const withdrawal = await withdrawalService.processWithdrawal(
      req.params.id,
      req.user.id,
      action,
      transactionReference,
      notes
    );

    logger.info(`Withdrawal ${action}d via API`, {
      withdrawalId: req.params.id,
      adminId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: `Withdrawal ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      data: { withdrawal },
    });
  }),
};

module.exports = withdrawalController;