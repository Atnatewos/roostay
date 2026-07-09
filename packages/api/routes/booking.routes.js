// packages/api/routes/booking.routes.js
// Booking management routes - handles reservation creation and status transitions
// Strictly authenticated and role-based
const express = require('express');
const router = express.Router();

// Middleware
const { authenticate, authorize } = require('../middleware');
const validateRequest = require('../middleware/validate');
const rateLimiter = require('../middleware/rateLimiter');

// Validators & Controllers
const bookingValidator = require('../validators/booking.validator');
const bookingController = require('../controllers/booking.controller');

// ============================================================================
// BOOKING ROUTES
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

module.exports = router;