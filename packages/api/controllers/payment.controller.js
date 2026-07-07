// packages/api/controllers/payment.controller.js
// Payment controller - handles HTTP requests for payment endpoints
// Supports payment creation, proof upload, and admin verification

const paymentService = require('../../services/payment.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const paymentController = {
  /**
   * POST /api/payments
   * Creates a payment for a confirmed booking.
   * Body: { bookingId, paymentMethod? }
   */
  createPayment: asyncHandler(async (req, res) => {
    const { bookingId, paymentMethod } = req.body;

    const result = await paymentService.createPayment(bookingId, req.user.id, paymentMethod);

    logger.info('Payment created via API', {
      paymentId: result.payment.id,
      bookingId,
      userId: req.user.id,
      method: paymentMethod,
    });

    res.status(201).json({
      success: true,
      message: 'Payment created. Please complete the transfer.',
      data: result,
    });
  }),

  /**
   * POST /api/payments/:id/proof
   * Uploads payment proof (receipt) for manual verification.
   * Body: { proofImageUrl, notes? }
   */
  uploadPaymentProof: asyncHandler(async (req, res) => {
    const { proofImageUrl, notes } = req.body;

    const payment = await paymentService.uploadPaymentProof(
      req.params.id,
      req.user.id,
      proofImageUrl,
      notes
    );

    res.status(200).json({
      success: true,
      message: 'Payment proof uploaded. Awaiting verification.',
      data: { payment },
    });
  }),

  /**
   * GET /api/payments/:id
   * Returns payment details by ID.
   */
  getPaymentById: asyncHandler(async (req, res) => {
    const payment = await paymentService.getPaymentById(req.params.id, req.user.id);

    res.status(200).json({
      success: true,
      data: { payment },
    });
  }),

  /**
   * PATCH /api/admin/payments/:id/verify
   * Verifies or rejects a payment (admin only).
   * Body: { action: 'verify'|'reject', reason? }
   */
  verifyPayment: asyncHandler(async (req, res) => {
    const { action, reason } = req.body;

    const payment = await paymentService.verifyPayment(
      req.params.id,
      req.user.id,
      action,
      reason
    );

    logger.info(`Payment ${action}d via API`, {
      paymentId: req.params.id,
      adminId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: `Payment ${action === 'verify' ? 'verified' : 'rejected'} successfully.`,
      data: { payment },
    });
  }),

  /**
   * GET /api/admin/payments
   * Lists all payments with filters (admin only).
   * Query: { page, limit, status, paymentMethod }
   */
  listPayments: asyncHandler(async (req, res) => {
    const result = await paymentService.listPayments(req.query);

    res.status(200).json({
      success: true,
      data: result.payments,
      pagination: result.pagination,
    });
  }),
};

module.exports = paymentController;