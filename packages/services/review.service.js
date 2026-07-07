// packages/services/review.service.js
// Review service - handles guest reviews for completed bookings
// Calculates overall ratings and supports host responses
// One review per booking enforced at database level

const { query, queryOne } = require('../database');
const { NotFoundError, ValidationError, ForbiddenError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const reviewService = {
  /**
   * Creates a review for a completed booking.
   * Only the guest who made the booking can review.
   * Each booking can only have one review.
   *
   * @param {string} userId - The reviewer (guest) user ID
   * @param {Object} reviewData - Review details { bookingId, ratings, reviewText }
   * @returns {Promise<Object>} Created review
   */
  async createReview(userId, reviewData) {
    const { bookingId, cleanliness, accuracy, communication, location, value, reviewText } = reviewData;

    // Verify booking exists and is completed
    const booking = await queryOne(
      `SELECT * FROM bookings WHERE id = $1 AND guest_id = $2`,
      [bookingId, userId]
    );

    if (!booking) {
      throw new NotFoundError('Booking not found or you are not the guest for this booking.');
    }

    if (booking.status !== 'completed') {
      throw new ValidationError(
        'You can only review completed bookings.'
      );
    }

    // Check if review already exists (also enforced by UNIQUE constraint)
    const existingReview = await queryOne(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [bookingId]
    );

    if (existingReview) {
      throw new ConflictError('You have already reviewed this booking.');
    }

    // Create the review
    const review = await queryOne(
      `INSERT INTO reviews (
        booking_id, listing_id, reviewer_id, reviewee_id,
        rating_cleanliness, rating_accuracy, rating_communication,
        rating_location, rating_value, review_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        bookingId,
        booking.listing_id,
        userId,
        booking.host_id,
        cleanliness,
        accuracy,
        communication,
        location,
        value,
        reviewText || null,
      ]
    );

    logger.info('Review created', {
      reviewId: review.id,
      bookingId,
      listingId: booking.listing_id,
      reviewerId: userId,
      ratingOverall: review.rating_overall,
    });

    return review;
  },

  /**
   * Adds a host response to a guest review.
   *
   * @param {string} reviewId - The review ID
   * @param {string} hostId - The host user ID
   * @param {string} responseText - The host's response
   * @returns {Promise<Object>} Updated review
   */
  async addHostResponse(reviewId, hostId, responseText) {
    const review = await queryOne(
      'SELECT * FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (!review) {
      throw new NotFoundError('Review not found.');
    }

    if (review.reviewee_id !== hostId) {
      throw new ForbiddenError('You can only respond to reviews on your own listings.');
    }

    if (review.host_response) {
      throw new ValidationError('You have already responded to this review.');
    }

    const updated = await queryOne(
      `UPDATE reviews SET host_response = $1, host_response_at = NOW()
       WHERE id = $2 RETURNING *`,
      [responseText, reviewId]
    );

    logger.info('Host response added', {
      reviewId,
      hostId,
    });

    return updated;
  },

  /**
   * Gets all reviews for a listing with pagination.
   *
   * @param {string} listingId - The listing ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated reviews with summary
   */
  async getListingReviews(listingId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    // Get review summary
    const summary = await queryOne(
      `SELECT COUNT(*) as total_reviews,
              ROUND(AVG(rating_overall)::numeric, 1) as avg_rating,
              ROUND(AVG(rating_cleanliness)::numeric, 1) as avg_cleanliness,
              ROUND(AVG(rating_accuracy)::numeric, 1) as avg_accuracy,
              ROUND(AVG(rating_communication)::numeric, 1) as avg_communication,
              ROUND(AVG(rating_location)::numeric, 1) as avg_location,
              ROUND(AVG(rating_value)::numeric, 1) as avg_value
       FROM reviews WHERE listing_id = $1`,
      [listingId]
    );

    // Get reviews
    const countResult = await queryOne(
      'SELECT COUNT(*) as total FROM reviews WHERE listing_id = $1',
      [listingId]
    );

    const reviews = await query(
      `SELECT r.*, u.first_name as reviewer_first_name, u.last_name as reviewer_last_name,
              u.profile_image_url as reviewer_image_url
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.listing_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [listingId, limit, offset]
    );

    return {
      summary: {
        totalReviews: parseInt(summary.total_reviews, 10),
        avgRating: parseFloat(summary.avg_rating) || 0,
        ratings: {
          cleanliness: parseFloat(summary.avg_cleanliness) || 0,
          accuracy: parseFloat(summary.avg_accuracy) || 0,
          communication: parseFloat(summary.avg_communication) || 0,
          location: parseFloat(summary.avg_location) || 0,
          value: parseFloat(summary.avg_value) || 0,
        },
      },
      reviews: reviews.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },
};

module.exports = reviewService;