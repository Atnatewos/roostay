// packages/api/routes/favorite.routes.js
// User favorites (wishlist) routes - handles saving and retrieving favorite listings
const express = require('express');
const router = express.Router();

// Middleware
const { authenticate } = require('../../middleware');
const validateRequest = require('../../middleware/validate');

// Validators & Controllers
const listingValidator = require('../validators/listing.validator');
const favoriteController = require('../controllers/favorite.controller');

// ============================================================================
// FAVORITE ROUTES
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

module.exports = router;