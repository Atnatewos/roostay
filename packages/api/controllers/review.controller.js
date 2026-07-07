// packages/api/controllers/review.controller.js
// Review controller - handles guest reviews and host responses
// Supports review creation and listing reviews

const reviewService = require('../../services/review.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const reviewController = {
  /**
   * POST /api/reviews
   * Creates a review for a completed booking.
   * Body: { bookingId, cleanliness, accuracy, communication, location, value, reviewText? }
   */
  createReview: asyncHandler(async (req, res) => {
    const review = await reviewService.createReview(req.user.id, req.body);

    logger.info('Review created via API', {
      reviewId: review.id,
      bookingId: req.body.bookingId,
      reviewerId: req.user.id,
      ratingOverall: review.rating_overall,
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: { review },
    });
  }),

  /**
   * POST /api/reviews/:id/response
   * Adds a host response to a review.
   * Body: { responseText }
   */
  addHostResponse: asyncHandler(async (req, res) => {
    const { responseText } = req.body;

    const review = await reviewService.addHostResponse(
      req.params.id,
      req.user.id,
      responseText
    );

    logger.info('Host response added via API', {
      reviewId: req.params.id,
      hostId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Response added successfully.',
      data: { review },
    });
  }),

  /**
   * GET /api/listings/:id/reviews
   * Returns all reviews for a listing with rating summary.
   * Query: { page, limit }
   */
  getListingReviews: asyncHandler(async (req, res) => {
    const result = await reviewService.getListingReviews(req.params.id, req.query);

    res.status(200).json({
      success: true,
      data: {
        summary: result.summary,
        reviews: result.reviews,
      },
      pagination: result.pagination,
    });
  }),
};

module.exports = reviewController;