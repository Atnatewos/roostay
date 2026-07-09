// packages/api/controllers/listing.controller.js
// Listing controller - handles HTTP requests for property listing endpoints
// Supports CRUD operations, search, and image management
const listingService = require('../../services/listing.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const { ValidationError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const listingController = {
  /**
   * POST /api/listings
   * Creates a new property listing.
   * Body: Full listing details including amenities array.
   */
  createListing: asyncHandler(async (req, res) => {
    const listing = await listingService.createListing(req.user.id, req.body);
    logger.info('Listing created via API', {
      listingId: listing.id,
      hostId: req.user.id,
      title: listing.title,
    });
    res.status(201).json({
      success: true,
      message: 'Listing created successfully.',
      data: { listing },
    });
  }),

  /**
   * GET /api/listings
   * Searches listings with filters and pagination.
   * Query: { page, limit, city, listingType, propertyType, minPrice, maxPrice, guests, ... }
   */
  searchListings: asyncHandler(async (req, res) => {
    const result = await listingService.searchListings(req.query);
    res.status(200).json({
      success: true,
      data: result.listings,
      pagination: result.pagination,
    });
  }),

  /**
   * GET /api/listings/:id
   * Returns full listing details by ID.
   */
  getListingById: asyncHandler(async (req, res) => {
    const listing = await listingService.getListingById(req.params.id);
    res.status(200).json({
      success: true,
      data: { listing },
    });
  }),

  /**
   * PUT /api/listings/:id
   * Updates a listing. Only the host who owns it can update.
   * Body: Any updatable listing fields.
   */
  updateListing: asyncHandler(async (req, res) => {
    const listing = await listingService.updateListing(req.params.id, req.user.id, req.body);
    logger.info('Listing updated via API', {
      listingId: req.params.id,
      hostId: req.user.id,
    });
    res.status(200).json({
      success: true,
      message: 'Listing updated successfully.',
      data: { listing },
    });
  }),

  /**
   * DELETE /api/listings/:id
   * Deletes a listing. Only the host owner or admin can delete.
   */
  deleteListing: asyncHandler(async (req, res) => {
    await listingService.deleteListing(req.params.id, req.user.id, req.user.role);
    logger.info('Listing deleted via API', {
      listingId: req.params.id,
      userId: req.user.id,
    });
    res.status(200).json({
      success: true,
      message: 'Listing deleted successfully.',
    });
  }),

  /**
   * GET /api/host/listings
   * Returns all listings for the authenticated host.
   * Query: { page, limit }
   */
  getHostListings: asyncHandler(async (req, res) => {
    const result = await listingService.getHostListings(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: result.listings,
      pagination: result.pagination,
    });
  }),

  /**
   * POST /api/listings/:id/images
   * Saves uploaded image URLs to the database for a specific listing.
   * Only the host owner can upload.
   * 
   * Body: { images: [{ url, publicId, width, height, format }] }
   */
  uploadListingImages: asyncHandler(async (req, res) => {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new ValidationError('An array of image objects is required.');
    }

    const { query } = require('../../database');
    const savedImages = [];

    // Insert each image URL into the database using parameterized queries
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.url) continue;

      const result = await query(
        `INSERT INTO listing_images (listing_id, image_url, sort_order, is_primary)
         VALUES ($1, $2, $3, $4)
         RETURNING id, image_url, sort_order, is_primary`,
        [req.params.id, img.url, i, i === 0]
      );
      savedImages.push(result);
    }

    logger.info('Listing images saved via API', {
      listingId: req.params.id,
      imageCount: savedImages.length,
    });

    res.status(201).json({
      success: true,
      message: `${savedImages.length} image(s) saved successfully.`,
      data: { images: savedImages },
    });
  }),
};

module.exports = listingController;