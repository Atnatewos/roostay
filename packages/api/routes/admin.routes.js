// packages/api/routes/admin.routes.js
// Administration routes - handles platform moderation, user management, and financial oversight
// Strictly restricted to the 'admin' role
const express = require('express');
const router = express.Router();

// Middleware
const { authenticate, authorize } = require('../../middleware');
const validateRequest = require('../../middleware/validate');

// Validators
const userValidator = require('../validators/user.validator');
const listingValidator = require('../validators/listing.validator');
const paymentValidator = require('../validators/payment.validator');
const withdrawalValidator = require('../validators/withdrawal.validator');

// Controllers
const adminController = require('../controllers/admin.controller');
const userController = require('../controllers/user.controller');
const listingController = require('../controllers/listing.controller');
const paymentController = require('../controllers/payment.controller');
const withdrawalController = require('../controllers/withdrawal.controller');

// ============================================================================
// ADMIN DASHBOARD & USER MANAGEMENT
// ============================================================================
router.get(
  '/admin/dashboard',
  authenticate,
  authorize('admin'),
  adminController.getDashboardStats
);

router.get(
  '/admin/users',
  authenticate,
  authorize('admin'),
  validateRequest({ query: userValidator.listUsers }),
  userController.listUsers
);

router.patch(
  '/admin/users/:id/toggle-status',
  authenticate,
  authorize('admin'),
  adminController.toggleUserStatus
);

// ============================================================================
// ADMIN LISTING MODERATION
// ============================================================================
router.get(
  '/admin/listings/pending',
  authenticate,
  authorize('admin'),
  adminController.getPendingListings
);

router.patch(
  '/admin/listings/:id/moderate',
  authenticate,
  authorize('admin'),
  validateRequest({ params: listingValidator.listingIdParam }),
  adminController.moderateListing
);

router.delete(
  '/admin/listings/:id',
  authenticate,
  authorize('admin'),
  validateRequest({ params: listingValidator.listingIdParam }),
  adminController.deleteListing
);

// ============================================================================
// ADMIN FINANCIAL OVERSIGHT (Payments & Withdrawals)
// ============================================================================
router.get(
  '/admin/payments',
  authenticate,
  authorize('admin'),
  validateRequest({ query: paymentValidator.listPayments }),
  paymentController.listPayments
);

router.patch(
  '/admin/payments/:id/verify',
  authenticate,
  authorize('admin'),
  validateRequest({
    params: paymentValidator.paymentIdParam,
    body: paymentValidator.verifyPayment,
  }),
  paymentController.verifyPayment
);

router.get(
  '/admin/withdrawals',
  authenticate,
  authorize('admin'),
  validateRequest({ query: withdrawalValidator.listWithdrawals }),
  withdrawalController.listWithdrawals
);

router.patch(
  '/admin/withdrawals/:id/process',
  authenticate,
  authorize('admin'),
  validateRequest({
    params: withdrawalValidator.withdrawalIdParam,
    body: withdrawalValidator.processWithdrawal,
  }),
  withdrawalController.processWithdrawal
);

module.exports = router;