// packages/api/routes/payment.routes.js
// Payment processing routes - handles payment creation, proof uploads, and transaction validation
// Integrates with the manual bank transfer verification flow
const express = require('express');
const router = express.Router();

// Middleware
const { authenticate, authorize } = require('../../middleware');
const validateRequest = require('../../middleware/validate');
const rateLimiter = require('../../middleware/rateLimiter');

// Validators & Controllers
const paymentValidator = require('../validators/payment.validator');
const paymentController = require('../controllers/payment.controller');

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

// Transaction validation endpoint - must be authenticated
router.post(
  '/payments/validate-transaction',
  authenticate,
  rateLimiter('payment'),
  validateRequest({ body: paymentValidator.validateTransaction }),
  paymentController.validateTransaction
);

// Payment creation
router.post(
  '/payments',
  authenticate,
  authorize('guest', 'admin'),
  rateLimiter('payment'),
  validateRequest({ body: paymentValidator.createPayment }),
  paymentController.createPayment
);

// Payment proof upload
router.post(
  '/payments/:id/proof',
  authenticate,
  authorize('guest', 'admin'),
  validateRequest({
    params: paymentValidator.paymentIdParam,
    body: paymentValidator.uploadPaymentProof,
  }),
  paymentController.uploadPaymentProof
);

// Get payment details
router.get(
  '/payments/:id',
  authenticate,
  validateRequest({ params: paymentValidator.paymentIdParam }),
  paymentController.getPaymentById
);

module.exports = router;