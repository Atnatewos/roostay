// packages/api/routes.js
// Central route configuration for the ROOSTAY API
// Mounts all route modules with their respective middleware chains
// Each route group applies authentication, authorization, validation, and rate limiting

const express = require('express');

// Middleware imports
const { authenticate, optionalAuth, authorize } = require('../middleware');
const validateRequest = require('../middleware/validate');
const rateLimiter = require('../middleware/rateLimiter');

// Validator imports
const authValidator = require('./validators/auth.validator');
const userValidator = require('./validators/user.validator');
const listingValidator = require('./validators/listing.validator');
const bookingValidator = require('./validators/booking.validator');
const paymentValidator = require('./validators/payment.validator');
const withdrawalValidator = require('./validators/withdrawal.validator');
const reviewValidator = require('./validators/review.validator');

// Controller imports
const authController = require('./controllers/auth.controller');
const userController = require('./controllers/user.controller');
const listingController = require('./controllers/listing.controller');
const bookingController = require('./controllers/booking.controller');
const paymentController = require('./controllers/payment.controller');
const withdrawalController = require('./controllers/withdrawal.controller');
const reviewController = require('./controllers/review.controller');
const favoriteController = require('./controllers/favorite.controller');
const notificationController = require('./controllers/notification.controller');
const adminController = require('./controllers/admin.controller');

const router = express.Router();

/**
 * Creates and returns the fully configured API router.
 * All routes are organized by resource and protected with appropriate middleware.
 *
 * @returns {express.Router} Configured Express router
 */
function createRoutes() {
  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  router.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'ROOSTAY API is running.',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // ============================================================================
  // AUTH ROUTES - Public (with strict rate limiting)
  // ============================================================================
  router.post(
    '/auth/register',
    rateLimiter('auth'),
    validateRequest({ body: authValidator.register }),
    authController.register
  );

  router.post(
    '/auth/login',
    rateLimiter('auth'),
    validateRequest({ body: authValidator.login }),
    authController.login
  );

  router.post(
    '/auth/refresh-token',
    rateLimiter('auth'),
    validateRequest({ body: authValidator.refreshToken }),
    authController.refreshToken
  );

  // Authenticated auth routes
  router.post(
    '/auth/change-password',
    authenticate,
    rateLimiter('auth'),
    validateRequest({ body: authValidator.changePassword }),
    authController.changePassword
  );

  router.get(
    '/auth/me',
    authenticate,
    authController.getMe
  );

  // ============================================================================
  // USER ROUTES - Authenticated
  // ============================================================================
  router.get(
    '/users/profile',
    authenticate,
    userController.getProfile
  );

  router.put(
    '/users/profile',
    authenticate,
    validateRequest({ body: userValidator.updateProfile }),
    userController.updateProfile
  );

  router.get(
    '/users/:id',
    authenticate,
    userController.getUserById
  );

  // ============================================================================
  // LISTING ROUTES - Mixed public and authenticated
  // ============================================================================
  router.post(
    '/listings',
    authenticate,
    authorize('host', 'admin'),
    rateLimiter('listing'),
    validateRequest({ body: listingValidator.createListing }),
    listingController.createListing
  );

  router.get(
    '/listings',
    optionalAuth,
    validateRequest({ query: listingValidator.searchListings }),
    listingController.searchListings
  );

  router.get(
    '/listings/:id',
    optionalAuth,
    validateRequest({ params: listingValidator.listingIdParam }),
    listingController.getListingById
  );

  router.put(
    '/listings/:id',
    authenticate,
    authorize('host', 'admin'),
    validateRequest({
      params: listingValidator.listingIdParam,
      body: listingValidator.updateListing,
    }),
    listingController.updateListing
  );

  router.delete(
    '/listings/:id',
    authenticate,
    authorize('host', 'admin'),
    validateRequest({ params: listingValidator.listingIdParam }),
    listingController.deleteListing
  );

  router.get(
    '/listings/:id/reviews',
    validateRequest({
      params: listingValidator.listingIdParam,
      query: reviewValidator.getListingReviews,
    }),
    reviewController.getListingReviews
  );

  router.get(
    '/listings/:id/availability',
    validateRequest({
      params: listingValidator.listingIdParam,
      query: bookingValidator.checkAvailability,
    }),
    bookingController.checkAvailability
  );

  // ============================================================================
  // HOST ROUTES - Host role only
  // ============================================================================
  router.get(
    '/host/listings',
    authenticate,
    authorize('host', 'admin'),
    listingController.getHostListings
  );

  // ============================================================================
  // BOOKING ROUTES - Authenticated
  // ============================================================================
  router.post(
    '/bookings',
    authenticate,
    authorize('guest', 'admin'),
    rateLimiter('booking'),
    validateRequest({ body: bookingValidator.createBooking }),
    bookingController.createBooking
  );

  router.get(
    '/bookings/guest',
    authenticate,
    authorize('guest', 'admin'),
    validateRequest({ query: bookingValidator.getUserBookings }),
    bookingController.getGuestBookings
  );

  router.get(
    '/bookings/host',
    authenticate,
    authorize('host', 'admin'),
    validateRequest({ query: bookingValidator.getUserBookings }),
    bookingController.getHostBookings
  );

  router.get(
    '/bookings/:id',
    authenticate,
    validateRequest({ params: bookingValidator.bookingIdParam }),
    bookingController.getBookingById
  );

  router.patch(
    '/bookings/:id/status',
    authenticate,
    validateRequest({
      params: bookingValidator.bookingIdParam,
      body: bookingValidator.updateBookingStatus,
    }),
    bookingController.updateBookingStatus
  );

  // ============================================================================
  // PAYMENT ROUTES - Authenticated
  // ============================================================================
  router.post(
    '/payments',
    authenticate,
    authorize('guest', 'admin'),
    rateLimiter('payment'),
    validateRequest({ body: paymentValidator.createPayment }),
    paymentController.createPayment
  );

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

  router.get(
    '/payments/:id',
    authenticate,
    validateRequest({ params: paymentValidator.paymentIdParam }),
    paymentController.getPaymentById
  );

  // ============================================================================
  // WITHDRAWAL ROUTES - Host only
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

  // ============================================================================
  // REVIEW ROUTES - Authenticated
  // ============================================================================
  router.post(
    '/reviews',
    authenticate,
    authorize('guest', 'admin'),
    validateRequest({ body: reviewValidator.createReview }),
    reviewController.createReview
  );

  router.post(
    '/reviews/:id/response',
    authenticate,
    authorize('host', 'admin'),
    validateRequest({
      params: reviewValidator.reviewIdParam,
      body: reviewValidator.addHostResponse,
    }),
    reviewController.addHostResponse
  );

  // ============================================================================
  // FAVORITE ROUTES - Authenticated
  // ============================================================================
  router.post(
    '/favorites/:listingId',
    authenticate,
    validateRequest({ params: listingValidator.listingIdParam }),
    favoriteController.toggleFavorite
  );

  router.get(
    '/favorites',
    authenticate,
    favoriteController.getUserFavorites
  );

  router.get(
    '/favorites/:listingId/check',
    authenticate,
    validateRequest({ params: listingValidator.listingIdParam }),
    favoriteController.checkFavorite
  );

  // ============================================================================
  // NOTIFICATION ROUTES - Authenticated
  // ============================================================================
  router.get(
    '/notifications',
    authenticate,
    notificationController.getUserNotifications
  );

  router.patch(
    '/notifications/:id/read',
    authenticate,
    notificationController.markAsRead
  );

  router.patch(
    '/notifications/read-all',
    authenticate,
    notificationController.markAllAsRead
  );

  // ============================================================================
  // ADMIN ROUTES - Admin role only
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

  return router;
}

module.exports = createRoutes;