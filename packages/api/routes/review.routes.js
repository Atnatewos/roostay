// packages/api/routes/review.routes.js
// Review routes - handles guest reviews and host responses
// All routes require authentication
const express = require('express');
const router = express.Router();

// Middleware
const { authenticate } = require('../../middleware');
const validateRequest = require('../../middleware/validate');

// Validators
const Joi = require('joi');

const reviewValidator = {
  createReview: Joi.object({
    bookingId: Joi.string().guid({ version: 'uuidv4' }).required(),
    cleanliness: Joi.number().integer().min(1).max(5).required(),
    accuracy: Joi.number().integer().min(1).max(5).required(),
    communication: Joi.number().integer().min(1).max(5).required(),
    location: Joi.number().integer().min(1).max(5).required(),
    value: Joi.number().integer().min(1).max(5).required(),
    reviewText: Joi.string().max(3000).optional().allow(null, ''),
  }),
  addHostResponse: Joi.object({
    responseText: Joi.string().min(1).max(2000).required(),
  }),
};

// Controllers & Services
const reviewController = require('../controllers/review.controller');

// ============================================================================
// REVIEW ROUTES
// ============================================================================

// Create a review for a completed booking
router.post(
  '/reviews',
  authenticate,
  validateRequest({ body: reviewValidator.createReview }),
  reviewController.createReview
);

// Add host response to a review
router.post(
  '/reviews/:id/response',
  authenticate,
  validateRequest({ body: reviewValidator.addHostResponse }),
  reviewController.addHostResponse
);

// Get all reviews for a listing
router.get(
  '/listings/:id/reviews',
  reviewController.getListingReviews
);

module.exports = router;