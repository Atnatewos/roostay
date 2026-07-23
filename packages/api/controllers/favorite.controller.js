// packages/api/controllers/favorite.controller.js
// Favorite controller - handles favorite listing toggle and retrieval

const favoriteService = require('../../services/favorite.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const favoriteController = {
  /**
   * POST /api/favorites/:id
   * Toggles a listing as favorite for the authenticated user.
   * If already favorited, removes it. If not, adds it.
   */
  toggleFavorite: asyncHandler(async (req, res) => {
    const result = await favoriteService.toggleFavorite(req.user.id, req.params.id);

    logger.info('Favorite toggled', {
      userId: req.user.id,
      listingId: req.params.id,
      action: result.action,
    });

    res.status(200).json({
      success: true,
      message: `Listing ${result.action === 'added' ? 'added to' : 'removed from'} favorites.`,
      data: result,
    });
  }),

  /**
   * GET /api/favorites
   * Returns all favorited listings for the authenticated user.
   * Query: { page, limit }
   */
  getUserFavorites: asyncHandler(async (req, res) => {
    const result = await favoriteService.getUserFavorites(req.user.id, req.query);

    res.status(200).json({
      success: true,
      data: result.favorites,
      pagination: result.pagination,
    });
  }),

  /**
   * GET /api/favorites/:id/check
   * Checks if a specific listing is favorited by the authenticated user.
   */
  checkFavorite: asyncHandler(async (req, res) => {
    const isFavorited = await favoriteService.isFavorited(req.user.id, req.params.id);

    res.status(200).json({
      success: true,
      data: { isFavorited },
    });
  }),
};

module.exports = favoriteController;