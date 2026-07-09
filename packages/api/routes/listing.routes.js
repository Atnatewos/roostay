// packages/api/routes/listing.routes.js
// Property listing routes - handles CRUD, search, reviews, and availability
// Mixes public search endpoints with host-only management endpoints
const express = require('express');
const router = express.Router();

// Middleware
const { authenticate, optionalAuth, authorize } = require('../middleware');
const validateRequest = require('../middleware/validate');
const rateLimiter = require('../middleware/rateLimiter');

// Validators
const listingValidator = require('../validators/listing.validator');
const reviewValidator = require('../validators/review.validator');
const bookingValidator = require('../validators/booking.validator');

// Controllers
const listingController = require('../controllers/listing.controller');
const reviewController = require('../controllers/review.controller');
const bookingController = require('../controllers/booking.controller');

// ============================================================================
// LISTING CRUD & SEARCH ROUTES
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

// ============================================================================
// LISTING SUB-RESOURCES (Reviews & Availability)
// ============================================================================
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
// HOST SPECIFIC ROUTES
// ============================================================================
router.get(
  '/host/listings',
  authenticate,
  authorize('host', 'admin'),
  listingController.getHostListings
);

module.exports = router;