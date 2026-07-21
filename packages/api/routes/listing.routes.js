// packages/api/routes/listing.routes.js
// Property listing routes — handles CRUD, search, reviews, availability, blocked dates, and similar listings
// Mixes public search endpoints with authenticated management endpoints
// Route ordering is critical: static paths MUST come before parameterized paths
// Author: Theron

const express = require('express');
const router = express.Router();

// --------------------------------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------------------------------
const { authenticate, optionalAuth, authorize } = require('../../middleware');
const validateRequest = require('../../middleware/validate');
const rateLimiter = require('../../middleware/rateLimiter');

// --------------------------------------------------------------------------
// VALIDATORS
// --------------------------------------------------------------------------
const listingValidator = require('../validators/listing.validator');
const reviewValidator = require('../validators/review.validator');
const bookingValidator = require('../validators/booking.validator');

// --------------------------------------------------------------------------
// CONTROLLERS
// --------------------------------------------------------------------------
const listingController = require('../controllers/listing.controller');
const reviewController = require('../controllers/review.controller');
const bookingController = require('../controllers/booking.controller');

// ============================================================================
// LISTING CRUD & SEARCH ROUTES
// ============================================================================

/**
 * POST /api/listings
 * Creates a new property listing for the authenticated host.
 * Requires host or admin role.
 */
router.post(
  '/listings',
  authenticate,
  authorize('host', 'admin'),
  rateLimiter('listing'),
  validateRequest({ body: listingValidator.createListing }),
  listingController.createListing
);

/**
 * GET /api/listings
 * Searches and filters property listings with pagination.
 * Public endpoint — no authentication required.
 */
router.get(
  '/listings',
  optionalAuth,
  validateRequest({ query: listingValidator.searchListings }),
  listingController.searchListings
);

// ============================================================================
// HOST-SPECIFIC ROUTE (STATIC — must come before /listings/:id)
// ============================================================================

/**
 * GET /api/listings/host
 * Returns all listings belonging to the authenticated host.
 * IMPORTANT: This static route must be registered BEFORE /listings/:id
 * to prevent Express from matching "host" as a listing ID parameter.
 */
router.get(
  '/listings/host',
  authenticate,
  authorize('host', 'admin'),
  listingController.getHostListings
);

// ============================================================================
// PARAMETERIZED LISTING ROUTES (must come after all static paths)
// ============================================================================

/**
 * GET /api/listings/:id
 * Returns full listing details including host info, amenities, and images.
 * Public endpoint — increments view count on each request.
 */
router.get(
  '/listings/:id',
  optionalAuth,
  validateRequest({ params: listingValidator.listingIdParam }),
  listingController.getListingById
);

/**
 * PUT /api/listings/:id
 * Updates an existing listing. Only the host owner or admin can update.
 */
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

/**
 * DELETE /api/listings/:id
 * Soft-deletes a listing by setting is_active to false.
 * Only the host owner or admin can delete.
 */
router.delete(
  '/listings/:id',
  authenticate,
  authorize('host', 'admin'),
  validateRequest({ params: listingValidator.listingIdParam }),
  listingController.deleteListing
);

// ============================================================================
// LISTING SUB-RESOURCES (Reviews, Availability, Blocked Dates, Similar)
// ============================================================================

/**
 * GET /api/listings/:id/reviews
 * Returns paginated reviews for a listing with rating summary.
 * Public endpoint.
 */
router.get(
  '/listings/:id/reviews',
  validateRequest({
    params: listingValidator.listingIdParam,
    query: reviewValidator.getListingReviews,
  }),
  reviewController.getListingReviews
);

/**
 * GET /api/listings/:id/availability
 * Checks date availability for a specific listing.
 * Public endpoint.
 */
router.get(
  '/listings/:id/availability',
  validateRequest({
    params: listingValidator.listingIdParam,
    query: bookingValidator.checkAvailability,
  }),
  bookingController.checkAvailability
);

/**
 * GET /api/listings/:id/blocked-dates
 * Returns all blocked date ranges with status labels (booked/pending).
 * Used by the DatePicker to show unavailable dates with context.
 * Public endpoint — no authentication required.
 */
router.get(
  '/listings/:id/blocked-dates',
  listingController.getBlockedDates
);

/**
 * GET /api/listings/:id/similar
 * Returns similar listings based on city, property type, and price range.
 * Used to suggest alternatives when a listing is fully booked.
 * Public endpoint.
 */
router.get(
  '/listings/:id/similar',
  listingController.getSimilarListings
);

// ============================================================================
// LISTING IMAGE UPLOAD ROUTE
// ============================================================================

/**
 * POST /api/listings/:id/images
 * Saves uploaded image URLs to the database for a specific listing.
 * Only the host owner can upload.
 */
router.post(
  '/listings/:id/images',
  authenticate,
  authorize('host', 'admin'),
  listingController.uploadListingImages
);

module.exports = router;