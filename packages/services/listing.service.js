// packages/services/listing.service.js
// Listing service - handles property listing CRUD and search
// Supports short-term, long-term, and dual listing types
// All queries use parameterized statements for security
// Feature flags control listing approval workflow via config
// Now returns favorite_count for social proof on listing cards
// Author: Theron

const { query, queryOne } = require('../database');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    features: {
      maxListingsPerHost: 50,
      maxImagesPerListing: 15,
      paginationDefaultLimit: 12,
      paginationMaxLimit: 50,
      listingApprovalRequired: false,
    },
  };
}

const listingService = {
  /**
   * Creates a new property listing.
   * Validates listing type and sets pricing fields accordingly.
   * Uses the listingApprovalRequired feature flag to determine initial approval state.
   *
   * @param {string} hostId      - The host user ID
   * @param {Object} listingData - Listing details
   * @returns {Promise<Object>} Created listing
   */
  async createListing(hostId, listingData) {
    // Check host listing limit from config
    const hostListingCount = await queryOne(
      'SELECT COUNT(*) as count FROM listings WHERE host_id = $1',
      [hostId]
    );

    const maxListings = config.features.maxListingsPerHost || 50;
    if (parseInt(hostListingCount.count, 10) >= maxListings) {
      throw new ValidationError(
        `Maximum listing limit reached. You can only have ${maxListings} active listings.`
      );
    }

    const {
      title,
      description,
      listingType,
      propertyType,
      bedrooms,
      bathrooms,
      maxGuests,
      bedsCount,
      pricePerNight,
      pricePerMonth,
      cleaningFee,
      securityDeposit,
      weeklyDiscountPercent,
      monthlyDiscountPercent,
      streetAddress,
      city,
      region,
      subcity,
      wereda,
      latitude,
      longitude,
      nearbyLandmarks,
      instantBook,
      minNights,
      maxNights,
      checkInTime,
      checkOutTime,
      houseRules,
      cancellationPolicy,
      amenities,
    } = listingData;

    // Validate listing type pricing
    if ((listingType === 'short_term' || listingType === 'both') && !pricePerNight) {
      throw new ValidationError('Price per night is required for short-term listings.');
    }

    if ((listingType === 'long_term' || listingType === 'both') && !pricePerMonth) {
      throw new ValidationError('Price per month is required for long-term listings.');
    }

    // Determine approval state based on feature flag
    const approvalRequired = config.features.listingApprovalRequired !== false;
    const isApproved = approvalRequired ? false : true;
    const approvalStatus = approvalRequired ? 'pending' : 'approved';

    const listing = await queryOne(
      `INSERT INTO listings (
        host_id, title, description, listing_type, property_type,
        bedrooms, bathrooms, max_guests, beds_count,
        price_per_night, price_per_month,
        cleaning_fee, security_deposit,
        weekly_discount_percent, monthly_discount_percent,
        street_address, city, region, subcity, wereda,
        latitude, longitude, nearby_landmarks,
        instant_book, min_nights, max_nights,
        check_in_time, check_out_time,
        house_rules, cancellation_policy,
        is_active, is_approved, approval_status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11,
        $12, $13,
        $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26,
        $27, $28,
        $29, $30,
        true, $31, $32
      ) RETURNING *`,
      [
        hostId,
        title,
        description,
        listingType,
        propertyType,
        bedrooms || 1,
        bathrooms || 1,
        maxGuests || 1,
        bedsCount || 1,
        pricePerNight || null,
        pricePerMonth || null,
        cleaningFee || 0,
        securityDeposit || 0,
        weeklyDiscountPercent || 0,
        monthlyDiscountPercent || 0,
        streetAddress,
        city,
        region || null,
        subcity || null,
        wereda || null,
        latitude || null,
        longitude || null,
        nearbyLandmarks || null,
        instantBook || false,
        minNights || 1,
        maxNights || null,
        checkInTime || '14:00',
        checkOutTime || '11:00',
        houseRules || null,
        cancellationPolicy || 'flexible',
        isApproved,
        approvalStatus,
      ]
    );

    // Insert amenities if provided
    if (amenities && Array.isArray(amenities) && amenities.length > 0) {
      const amenityValues = amenities
        .map(
          (a, index) =>
            `($1, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4})`
        )
        .join(', ');

      const amenityParams = [listing.id];
      amenities.forEach((a) => {
        amenityParams.push(a.name, a.category || null, a.iconName || null);
      });

      await query(
        `INSERT INTO listing_amenities (listing_id, amenity_name, category, icon_name) VALUES ${amenityValues}
         ON CONFLICT (listing_id, amenity_name) DO NOTHING`,
        amenityParams
      );
    }

    logger.info('Listing created', {
      listingId: listing.id,
      hostId,
      listingType,
      city,
      approvalStatus,
    });

    return listing;
  },

  /**
   * Retrieves a single listing by ID with all related data.
   * Includes favorite count for social proof display.
   *
   * @param {string} listingId - The listing ID
   * @returns {Promise<Object>} Full listing details with host info, amenities, images
   * @throws {NotFoundError} If listing does not exist
   */
  async getListingById(listingId) {
    const listing = await queryOne(
      `SELECT l.*, u.first_name as host_first_name, u.last_name as host_last_name,
              u.profile_image_url as host_image_url
       FROM listings l
       JOIN users u ON l.host_id = u.id
       WHERE l.id = $1`,
      [listingId]
    );

    if (!listing) {
      throw new NotFoundError('Listing not found.');
    }

    // Increment view count
    await query('UPDATE listings SET view_count = view_count + 1 WHERE id = $1', [listingId]);

    // Fetch amenities
    const amenities = await query(
      'SELECT amenity_name, category, icon_name FROM listing_amenities WHERE listing_id = $1 ORDER BY category, amenity_name',
      [listingId]
    );

    // Fetch images
    const images = await query(
      'SELECT id, image_url, thumbnail_url, alt_text, sort_order, is_primary FROM listing_images WHERE listing_id = $1 ORDER BY sort_order',
      [listingId]
    );

    // Fetch reviews summary
    const reviewsSummary = await queryOne(
      `SELECT COUNT(*) as total_reviews,
              ROUND(AVG(rating_overall)::numeric, 1) as avg_rating
       FROM reviews WHERE listing_id = $1`,
      [listingId]
    );

    // Fetch favorite count for social proof
    const favoriteCount = await queryOne(
      'SELECT COUNT(*) as count FROM favorites WHERE listing_id = $1',
      [listingId]
    );

    return {
      id: listing.id,
      hostId: listing.host_id,
      host: {
        firstName: listing.host_first_name,
        lastName: listing.host_last_name,
        imageUrl: listing.host_image_url,
      },
      title: listing.title,
      description: listing.description,
      listingType: listing.listing_type,
      propertyType: listing.property_type,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      maxGuests: listing.max_guests,
      bedsCount: listing.beds_count,
      pricePerNight: listing.price_per_night,
      pricePerMonth: listing.price_per_month,
      cleaningFee: listing.cleaning_fee,
      securityDeposit: listing.security_deposit,
      weeklyDiscountPercent: listing.weekly_discount_percent,
      monthlyDiscountPercent: listing.monthly_discount_percent,
      location: {
        streetAddress: listing.street_address,
        city: listing.city,
        region: listing.region,
        subcity: listing.subcity,
        wereda: listing.wereda,
        latitude: listing.latitude,
        longitude: listing.longitude,
        nearbyLandmarks: listing.nearby_landmarks,
      },
      instantBook: listing.instant_book,
      minNights: listing.min_nights,
      maxNights: listing.max_nights,
      checkInTime: listing.check_in_time,
      checkOutTime: listing.check_out_time,
      houseRules: listing.house_rules,
      cancellationPolicy: listing.cancellation_policy,
      amenities: amenities.rows,
      images: images.rows,
      reviews: {
        total: parseInt(reviewsSummary.total_reviews, 10),
        avgRating: parseFloat(reviewsSummary.avg_rating) || 0,
      },
      viewCount: listing.view_count,
      favoriteCount: parseInt(favoriteCount.count, 10) || 0,
      isActive: listing.is_active,
      isApproved: listing.is_approved,
      createdAt: listing.created_at,
    };
  },

  /**
   * Searches listings with filters and pagination.
   * Includes favorite count for social proof on each listing card.
   *
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Paginated search results with favorite counts
   */
  async searchListings(filters = {}) {
    const {
      page = 1,
      limit = config.features.paginationDefaultLimit || 12,
      city,
      listingType,
      propertyType,
      minPrice,
      maxPrice,
      guests,
      bedrooms,
      bathrooms,
      amenities,
      instantBook,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = filters;

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE l.is_active = true AND l.is_approved = true';
    const params = [];
    let paramIndex = 1;

    if (city) {
      whereClause += ` AND l.city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    if (listingType) {
      whereClause += ` AND (l.listing_type = $${paramIndex} OR l.listing_type = 'both')`;
      params.push(listingType);
      paramIndex++;
    }

    if (propertyType) {
      whereClause += ` AND l.property_type = $${paramIndex}`;
      params.push(propertyType);
      paramIndex++;
    }

    if (minPrice) {
      whereClause += ` AND (l.price_per_night >= $${paramIndex} OR l.price_per_month >= $${paramIndex})`;
      params.push(minPrice);
      paramIndex++;
    }

    if (maxPrice) {
      whereClause += ` AND (l.price_per_night <= $${paramIndex} OR l.price_per_month <= $${paramIndex})`;
      params.push(maxPrice);
      paramIndex++;
    }

    if (guests) {
      whereClause += ` AND l.max_guests >= $${paramIndex}`;
      params.push(guests);
      paramIndex++;
    }

    if (bedrooms) {
      whereClause += ` AND l.bedrooms >= $${paramIndex}`;
      params.push(bedrooms);
      paramIndex++;
    }

    if (bathrooms) {
      whereClause += ` AND l.bathrooms >= $${paramIndex}`;
      params.push(bathrooms);
      paramIndex++;
    }

    if (instantBook !== undefined) {
      whereClause += ` AND l.instant_book = $${paramIndex}`;
      params.push(instantBook);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (l.title ILIKE $${paramIndex} OR l.description ILIKE $${paramIndex} OR l.city ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Validate sort field to prevent SQL injection
    const allowedSortFields = [
      'created_at',
      'price_per_night',
      'price_per_month',
      'view_count',
      'bedrooms',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM listings l ${whereClause}`,
      params
    );

    params.push(limit);
    params.push(offset);

    const listings = await query(
      `SELECT l.id, l.title, l.listing_type, l.property_type,
              l.bedrooms, l.bathrooms, l.max_guests,
              l.price_per_night, l.price_per_month,
              l.street_address, l.city, l.subcity,
              l.latitude, l.longitude,
              l.instant_book, l.view_count, l.created_at,
              u.first_name as host_first_name, u.last_name as host_last_name,
              (SELECT COUNT(*) FROM favorites f WHERE f.listing_id = l.id) as favorite_count
       FROM listings l
       JOIN users u ON l.host_id = u.id
       ${whereClause}
       ORDER BY l.${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    // Get primary image for each listing
    const listingIds = listings.rows.map((l) => l.id);
    let primaryImages = {};
    if (listingIds.length > 0) {
      const images = await query(
        `SELECT listing_id, image_url FROM listing_images
         WHERE listing_id = ANY($1::uuid[]) AND is_primary = true`,
        [listingIds]
      );
      images.rows.forEach((img) => {
        primaryImages[img.listing_id] = img.image_url;
      });
    }

    return {
      listings: listings.rows.map((l) => ({
        id: l.id,
        title: l.title,
        listingType: l.listing_type,
        propertyType: l.property_type,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        maxGuests: l.max_guests,
        pricePerNight: l.price_per_night,
        pricePerMonth: l.price_per_month,
        location: {
          streetAddress: l.street_address,
          city: l.city,
          subcity: l.subcity,
          latitude: l.latitude,
          longitude: l.longitude,
        },
        host: {
          firstName: l.host_first_name,
          lastName: l.host_last_name,
        },
        primaryImage: primaryImages[l.id] || null,
        instantBook: l.instant_book,
        viewCount: l.view_count,
        favoriteCount: parseInt(l.favorite_count, 10) || 0,
        createdAt: l.created_at,
      })),
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },

  /**
   * Updates a listing. Only the owner can update.
   *
   * @param {string} listingId - The listing ID
   * @param {string} hostId    - The host user ID
   * @param {Object} updates   - Fields to update
   * @returns {Promise<Object>} Updated listing
   */
  async updateListing(listingId, hostId, updates) {
    const listing = await queryOne('SELECT * FROM listings WHERE id = $1', [listingId]);

    if (!listing) {
      throw new NotFoundError('Listing not found.');
    }

    if (listing.host_id !== hostId) {
      throw new ForbiddenError('You can only update your own listings.');
    }

    const updatableFields = [
      'title', 'description', 'price_per_night', 'price_per_month',
      'bedrooms', 'bathrooms', 'max_guests', 'beds_count',
      'cleaning_fee', 'security_deposit',
      'weekly_discount_percent', 'monthly_discount_percent',
      'street_address', 'city', 'region', 'subcity', 'wereda',
      'latitude', 'longitude', 'nearby_landmarks',
      'instant_book', 'min_nights', 'max_nights',
      'check_in_time', 'check_out_time',
      'house_rules', 'cancellation_policy', 'listing_type', 'property_type',
    ];

    const fieldMap = {
      pricePerNight: 'price_per_night',
      pricePerMonth: 'price_per_month',
      maxGuests: 'max_guests',
      bedsCount: 'beds_count',
      cleaningFee: 'cleaning_fee',
      securityDeposit: 'security_deposit',
      weeklyDiscountPercent: 'weekly_discount_percent',
      monthlyDiscountPercent: 'monthly_discount_percent',
      streetAddress: 'street_address',
      nearbyLandmarks: 'nearby_landmarks',
      instantBook: 'instant_book',
      minNights: 'min_nights',
      maxNights: 'max_nights',
      checkInTime: 'check_in_time',
      checkOutTime: 'check_out_time',
      houseRules: 'house_rules',
      cancellationPolicy: 'cancellation_policy',
      listingType: 'listing_type',
      propertyType: 'property_type',
    };

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMap[key] || key;
      if (updatableFields.includes(dbField) && value !== undefined) {
        setClauses.push(`${dbField} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new ValidationError('No valid fields to update.');
    }

    params.push(listingId);

    const updated = await queryOne(
      `UPDATE listings SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    logger.info('Listing updated', { listingId, hostId });

    return updated;
  },

  /**
   * Deletes a listing. Only the owner or admin can delete.
   *
   * @param {string} listingId - The listing ID
   * @param {string} userId    - The requesting user ID
   * @param {string} userRole  - The requesting user role
   */
  async deleteListing(listingId, userId, userRole) {
    const listing = await queryOne('SELECT host_id FROM listings WHERE id = $1', [listingId]);

    if (!listing) {
      throw new NotFoundError('Listing not found.');
    }

    if (listing.host_id !== userId && userRole !== 'admin') {
      throw new ForbiddenError('You do not have permission to delete this listing.');
    }

    await query('DELETE FROM listings WHERE id = $1', [listingId]);

    logger.info('Listing deleted', { listingId, userId });
  },

  /**
   * Gets all listings for a specific host.
   *
   * @param {string} hostId  - The host user ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated host listings
   */
  async getHostListings(hostId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const countResult = await queryOne(
      'SELECT COUNT(*) as total FROM listings WHERE host_id = $1',
      [hostId]
    );

    const listings = await query(
      `SELECT l.*, 
              (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = true LIMIT 1) as primary_image,
              (SELECT COUNT(*) FROM favorites f WHERE f.listing_id = l.id) as favorite_count
       FROM listings l
       WHERE l.host_id = $1
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      [hostId, limit, offset]
    );

    return {
      listings: listings.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },
};

module.exports = listingService;