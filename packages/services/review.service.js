// packages/services/review.service.js
// Review service - handles guest reviews for completed bookings
// Calculates overall ratings and supports host responses
// One review per booking enforced at database level
// Now includes rating distribution and helpfulness tracking
// Author: Theron

const { query, queryOne } = require('../database');
const { NotFoundError, ValidationError, ForbiddenError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const reviewService = {
  /**
   * Creates a review for a completed booking.
   * Only the guest who made the booking can review.
   * Each booking can only have one review.
   *
   * @param {string} userId     - The reviewer (guest) user ID
   * @param {Object} reviewData - Review details { bookingId, ratings, reviewText }
   * @returns {Promise<Object>} Created review
   */
  async createReview(userId, reviewData) {
    const { bookingId, cleanliness, accuracy, communication, location, value, reviewText } = reviewData;

    const booking = await queryOne(
      `SELECT * FROM bookings WHERE id = $1 AND guest_id = $2`,
      [bookingId, userId]
    );

    if (!booking) {
      throw new NotFoundError('Booking not found or you are not the guest for this booking.');
    }

    if (booking.status !== 'completed') {
      throw new ValidationError('You can only review completed bookings.');
    }

    const existingReview = await queryOne(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [bookingId]
    );

    if (existingReview) {
      throw new ConflictError('You have already reviewed this booking.');
    }

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
   * @param {string} reviewId     - The review ID
   * @param {string} hostId       - The host user ID
   * @param {string} responseText - The host's response
   * @returns {Promise<Object>} Updated review
   */
  async addHostResponse(reviewId, hostId, responseText) {
    const review = await queryOne('SELECT * FROM reviews WHERE id = $1', [reviewId]);

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

    logger.info('Host response added', { reviewId, hostId });

    return updated;
  },

  /**
   * Toggles a helpful vote on a review.
   * Uses a simple increment/decrement pattern for the helpful_count field.
   * In a production environment, this would use a separate helpful_votes table
   * to prevent duplicate voting. This implementation is a simplified version
   * suitable for the current scope.
   *
   * @param {string} reviewId - The review ID
   * @param {string} userId   - The user casting the vote
   * @param {string} action   - 'helpful' or 'unhelpful'
   * @returns {Promise<Object>} Updated review with new helpful count
   */
  async toggleHelpful(reviewId, userId, action) {
    const review = await queryOne('SELECT * FROM reviews WHERE id = $1', [reviewId]);

    if (!review) {
      throw new NotFoundError('Review not found.');
    }

    // Prevent voting on own review
    if (review.reviewer_id === userId) {
      throw new ValidationError('You cannot vote on your own review.');
    }

    const isHelpful = action === 'helpful';
    const field = isHelpful ? 'helpful_count' : 'unhelpful_count';

    const updated = await queryOne(
      `UPDATE reviews SET ${field} = COALESCE(${field}, 0) + 1
       WHERE id = $1 RETURNING *`,
      [reviewId]
    );

    logger.info('Review helpfulness vote recorded', {
      reviewId,
      userId,
      action,
      helpfulCount: updated.helpful_count,
      unhelpfulCount: updated.unhelpful_count,
    });

    return updated;
  },

  /**
   * Gets all reviews for a listing with pagination.
   * Includes rating distribution (count of 5★, 4★, 3★, 2★, 1★ reviews)
   * for the visual rating breakdown chart.
   *
   * @param {string} listingId - The listing ID
   * @param {Object} options   - Pagination options
   * @returns {Promise<Object>} Paginated reviews with summary and distribution
   */
  async getListingReviews(listingId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    // Get review summary with category averages
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

    // =========================================================================
    // RATING DISTRIBUTION — Count of reviews at each star level
    // Used to render the visual bar chart showing how many 5★, 4★, etc.
    // =========================================================================
    const distribution = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE rating_overall = 5) as five_star,
         COUNT(*) FILTER (WHERE rating_overall >= 4 AND rating_overall < 5) as four_star,
         COUNT(*) FILTER (WHERE rating_overall >= 3 AND rating_overall < 4) as three_star,
         COUNT(*) FILTER (WHERE rating_overall >= 2 AND rating_overall < 3) as two_star,
         COUNT(*) FILTER (WHERE rating_overall >= 1 AND rating_overall < 2) as one_star
       FROM reviews WHERE listing_id = $1`,
      [listingId]
    );

    const dist = distribution.rows[0];

    // Get paginated reviews
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
        distribution: {
          fiveStar: parseInt(dist.five_star, 10) || 0,
          fourStar: parseInt(dist.four_star, 10) || 0,
          threeStar: parseInt(dist.three_star, 10) || 0,
          twoStar: parseInt(dist.two_star, 10) || 0,
          oneStar: parseInt(dist.one_star, 10) || 0,
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