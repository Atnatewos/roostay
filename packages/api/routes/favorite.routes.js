// packages/api/routes/favorite.routes.js
// User favorites (wishlist) routes - handles saving and retrieving favorite listings
const express = require('express');
const router = express.Router();

// Middleware
const { authenticate } = require('../../middleware');
const validateRequest = require('../../middleware/validate');

// Validators & Controllers
const favoriteValidator = require('../validators/favorite.validator');
const favoriteController = require('../controllers/favorite.controller');

// ============================================================================
// FAVORITE ROUTES
// ============================================================================

/**
 * POST /api/favorites/:id
 * Toggles a listing as favorite for the authenticated user.
 */
router.post(
  '/favorites/:id',
  authenticate,
  validateRequest({ params: favoriteValidator.listingIdParam }),
  favoriteController.toggleFavorite
);

/**
 * GET /api/favorites
 * Returns all favorited listings for the authenticated user.
 * Query: { page, limit }
 */
router.get(
  '/favorites',
  authenticate,
  favoriteController.getUserFavorites
);

/**
 * GET /api/favorites/:id/check
 * Checks if a specific listing is favorited by the authenticated user.
 */
router.get(
  '/favorites/:id/check',
  authenticate,
  validateRequest({ params: favoriteValidator.listingIdParam }),
  favoriteController.checkFavorite
);

module.exports = router;