// packages/services/favorite.service.js
// Favorite service - manages user's saved/favorite listings
// Simple toggle functionality with listing validation

const { query, queryOne, queryExists } = require('../database');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

const favoriteService = {
  /**
   * Toggles a listing as favorite for a user.
   * If already favorited, removes it. If not, adds it.
   *
   * @param {string} userId - The user ID
   * @param {string} listingId - The listing ID
   * @returns {Promise<Object>} Action result { action: 'added'|'removed' }
   */
  async toggleFavorite(userId, listingId) {
    // Verify listing exists
    const listing = await queryOne(
      'SELECT id FROM listings WHERE id = $1 AND is_active = true',
      [listingId]
    );

    if (!listing) {
      throw new NotFoundError('Listing not found.');
    }

    // Check if already favorited
    const existing = await queryOne(
      'SELECT id FROM favorites WHERE user_id = $1 AND listing_id = $2',
      [userId, listingId]
    );

    if (existing) {
      // Remove favorite
      await query(
        'DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2',
        [userId, listingId]
      );

      logger.debug('Favorite removed', { userId, listingId });

      return { action: 'removed' };
    }

    // Add favorite
    await query(
      'INSERT INTO favorites (user_id, listing_id) VALUES ($1, $2)',
      [userId, listingId]
    );

    logger.debug('Favorite added', { userId, listingId });

    return { action: 'added' };
  },

  /**
   * Gets all favorited listings for a user with pagination.
   *
   * @param {string} userId - The user ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated favorite listings
   */
  async getUserFavorites(userId, options = {}) {
    const { page = 1, limit = 12 } = options;
    const offset = (page - 1) * limit;

    const countResult = await queryOne(
      'SELECT COUNT(*) as total FROM favorites WHERE user_id = $1',
      [userId]
    );

    const favorites = await query(
      `SELECT f.id as favorite_id, f.created_at as favorited_at,
              l.id, l.title, l.listing_type, l.property_type,
              l.bedrooms, l.bathrooms, l.max_guests,
              l.price_per_night, l.price_per_month,
              l.street_address, l.city,
              l.is_active, l.is_approved,
              u.first_name as host_first_name, u.last_name as host_last_name,
              (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = true LIMIT 1) as primary_image
       FROM favorites f
       JOIN listings l ON f.listing_id = l.id
       JOIN users u ON l.host_id = u.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      favorites: favorites.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },

  /**
   * Checks if a listing is favorited by a user.
   *
   * @param {string} userId - The user ID
   * @param {string} listingId - The listing ID
   * @returns {Promise<boolean>} True if favorited
   */
  async isFavorited(userId, listingId) {
    return await queryExists(
      'SELECT 1 FROM favorites WHERE user_id = $1 AND listing_id = $2',
      [userId, listingId]
    );
  },
};

module.exports = favoriteService;