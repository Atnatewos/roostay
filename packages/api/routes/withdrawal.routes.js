// packages/api/routes/withdrawal.routes.js
// Host withdrawal routes - handles payout requests and history
// Restricted to hosts and admins
const express = require('express');
const router = express.Router();

// Middleware
const { authenticate, authorize } = require('../../middleware');
const validateRequest = require('../../middleware/validate');
const rateLimiter = require('../../middleware/rateLimiter');

// Validators & Controllers
const withdrawalValidator = require('../validators/withdrawal.validator');
const withdrawalController = require('../controllers/withdrawal.controller');

// ============================================================================
// WITHDRAWAL ROUTES
// ============================================================================
router.post(
  '/withdrawals',
  authenticate,
  authorize('host', 'admin'),
  rateLimiter('payment'),
  validateRequest({ body: withdrawalValidator.requestWithdrawal }),
  withdrawalController.requestWithdrawal
);

router.get(
  '/withdrawals',
  authenticate,
  authorize('host', 'admin'),
  withdrawalController.getUserWithdrawals
);

module.exports = router;