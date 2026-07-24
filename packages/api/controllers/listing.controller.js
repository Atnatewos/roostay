// packages/api/controllers/listing.controller.js
// Listing controller — handles HTTP requests for property listing endpoints
// Supports CRUD operations, search, image management, blocked dates, and similar listings
// Author: Theron

const listingService = require('../../services/listing.service');
const { query } = require('../../database');
const { asyncHandler } = require('../../utils/asyncHandler');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const listingController = {

  /**
   * POST /api/listings
   * Creates a new property listing for the authenticated host.
   * Delegates all business logic to listingService.
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
   * Searches and filters property listings with pagination.
   * Public endpoint — no authentication required.
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
   * Returns full listing details including host info, amenities, and images.
   * Public endpoint — increments view count on each request.
   */
  getListingById: asyncHandler(async (req, res) => {

    const listing = await listingService.getListingById(req.params.id, req.user?.id);

    res.status(200).json({
      success: true,
      data: { listing },
    });
  }),

  /**
   * PUT /api/listings/:id
   * Updates an existing listing. Only the host owner or admin can update.
   * Delegates ownership verification to listingService.
   */
  updateListing: asyncHandler(async (req, res) => {
    const listing = await listingService.updateListing(
      req.params.id,
      req.user.id,
      req.body
    );

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
   * Soft-deletes a listing by setting is_active to false.
   * Only the host owner or admin can delete.
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
   * GET /api/listings/host
   * Returns all listings belonging to the authenticated host.
   */
  getHostListings: asyncHandler(async (req, res) => {
    const result = await listingService.getHostListings(req.user.id, req.query);

    res.status(200).json({
      success: true,
      data: result.listings,
      pagination: result.pagination,
    });
  }),

  // =========================================================================
  // GET /api/listings/:id/blocked-dates
  // Returns all blocked date ranges for a listing with status labels.
  // Groups consecutive dates into display-friendly ranges.
  // Used by the DatePicker to show unavailable dates with context.
  // =========================================================================
  getBlockedDates: asyncHandler(async (req, res) => {
    const listingId = req.params.id;

    // Verify the listing exists and is active before querying blocked dates
    const listing = await listingService.getListingById(listingId);
    if (!listing || !listing.isActive) {
      throw new NotFoundError('Listing not found.');
    }

    // Generate a date series for the next 365 days and check each date
    // against confirmed and pending bookings for this listing.
    // Confirmed bookings = hard-blocked ("booked")
    // Pending bookings   = soft-blocked ("pending" — may expire)
    const blockedDates = await query(
      `SELECT DISTINCT
              d::date as date,
              CASE
                WHEN EXISTS (
                  SELECT 1 FROM bookings b
                  WHERE b.listing_id = $1
                    AND b.status = 'confirmed'
                    AND d::date >= b.check_in_date
                    AND d::date < b.check_out_date
                ) THEN 'booked'
                WHEN EXISTS (
                  SELECT 1 FROM bookings b
                  WHERE b.listing_id = $1
                    AND b.status = 'pending'
                    AND d::date >= b.check_in_date
                    AND d::date < b.check_out_date
                ) THEN 'pending'
                ELSE 'available'
              END as status
       FROM generate_series(
         CURRENT_DATE,
         CURRENT_DATE + INTERVAL '365 days',
         '1 day'::interval
       ) AS d
       WHERE EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.listing_id = $1
           AND b.status IN ('confirmed', 'pending')
           AND d::date >= b.check_in_date
           AND d::date < b.check_out_date
       )
       ORDER BY d::date`,
      [listingId]
    );

    // Group consecutive dates with the same status into ranges.
    // Example: Three individual days become "July 14-16 (Booked)"
    const ranges = [];
    let currentRange = null;

    for (const row of blockedDates.rows) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];

      if (!currentRange) {
        // Start the first range
        currentRange = {
          startDate: dateStr,
          endDate: dateStr,
          status: row.status,
        };
      } else if (
        currentRange.status === row.status &&
        new Date(row.date).getTime() -
          new Date(currentRange.endDate).getTime() ===
          86400000
      ) {
        // Extend the current range — consecutive day with same status
        currentRange.endDate = dateStr;
      } else {
        // Different status or a gap — save current range and start new one
        ranges.push(currentRange);
        currentRange = {
          startDate: dateStr,
          endDate: dateStr,
          status: row.status,
        };
      }
    }

    // Push the final range if one was being built
    if (currentRange) {
      ranges.push(currentRange);
    }

    // Return both grouped ranges (for display) and individual dates (for calendar)
    res.json({
      success: true,
      data: {
        blockedRanges: ranges,
        blockedDates: blockedDates.rows.map((r) => ({
          date: new Date(r.date).toISOString().split('T')[0],
          status: r.status,
        })),
      },
    });
  }),

  // =========================================================================
  // GET /api/listings/:id/similar
  // Returns similar listings based on city, property type, and price range.
  // Excludes the current listing from results.
  // Used to suggest alternatives when a listing is fully booked.
  // =========================================================================
  getSimilarListings: asyncHandler(async (req, res) => {
    const listingId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);

    // Fetch the current listing to use as the similarity reference point
    const currentListing = await query(
      `SELECT city, listing_type, property_type, price_per_night, price_per_month
       FROM listings WHERE id = $1 AND is_active = true`,
      [listingId]
    );

    if (currentListing.rows.length === 0) {
      throw new NotFoundError('Listing not found.');
    }

    const cl = currentListing.rows[0];

    // Determine the reference price for similarity matching
    const refPrice = parseFloat(cl.price_per_night || cl.price_per_month || 0);

    // Find similar listings: same city, price within ±50%, same type preferred
    const similar = await query(
      `SELECT l.id, l.title, l.listing_type, l.property_type,
              l.bedrooms, l.bathrooms, l.max_guests,
              l.price_per_night, l.price_per_month,
              l.city, l.subcity, l.street_address, l.instant_book,
              (SELECT image_url FROM listing_images
               WHERE listing_id = l.id AND is_primary = true LIMIT 1) as primary_image
       FROM listings l
       WHERE l.id != $1
         AND l.is_active = true
         AND l.is_approved = true
         AND l.city = $2
         AND (
           (l.price_per_night IS NOT NULL
            AND l.price_per_night BETWEEN $3 AND $4)
           OR
           (l.price_per_month IS NOT NULL
            AND l.price_per_month BETWEEN $5 AND $6)
           OR
           (l.listing_type = $7)
         )
       ORDER BY
         CASE WHEN l.property_type = $8 THEN 0 ELSE 1 END,
         RANDOM()
       LIMIT $9`,
      [
        listingId,
        cl.city,
        refPrice * 0.5,
        refPrice * 1.5,
        refPrice * 0.5,
        refPrice * 1.5,
        cl.listing_type,
        cl.property_type,
        limit,
      ]
    );

    res.json({
      success: true,
      data: similar.rows.map((l) => ({
        id: l.id,
        title: l.title,
        listingType: l.listing_type,
        propertyType: l.property_type,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        maxGuests: l.max_guests,
        pricePerNight: l.price_per_night,
        pricePerMonth: l.price_per_month,
        city: l.city,
        subcity: l.subcity,
        primaryImage: l.primary_image,
        instantBook: l.instant_book,
      })),
      meta: {
        basedOn: {
          city: cl.city,
          propertyType: cl.property_type,
          priceRange: `${refPrice * 0.5} - ${refPrice * 1.5}`,
        },
      },
    });
  }),

  /**
   * POST /api/listings/:id/images
   * Saves uploaded image URLs to the database for a specific listing.
   * Only the host owner can upload.
   */
  uploadListingImages: asyncHandler(async (req, res) => {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new ValidationError('An array of image objects is required.');
    }

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
      savedImages.push(result.rows[0]);
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