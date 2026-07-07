// packages/api/validators/listing.validator.js
// Joi validation schemas for listing endpoints
// Validates create, update, and search operations with all listing fields

const Joi = require('joi');

const listingValidator = {
  /**
   * Create listing validation schema.
   * Validates all required fields for property creation.
   * Pricing fields depend on listing type (short_term/long_term/both).
   */
  createListing: Joi.object({
    title: Joi.string()
      .trim()
      .min(5)
      .max(255)
      .required()
      .messages({
        'string.min': 'Title must be at least 5 characters.',
        'string.max': 'Title must be less than 255 characters.',
        'any.required': 'Title is required.',
      }),

    description: Joi.string()
      .trim()
      .min(20)
      .max(5000)
      .required()
      .messages({
        'string.min': 'Description must be at least 20 characters.',
        'string.max': 'Description must be less than 5000 characters.',
        'any.required': 'Description is required.',
      }),

    listingType: Joi.string()
      .valid('short_term', 'long_term', 'both')
      .required()
      .messages({
        'any.only': 'Listing type must be short_term, long_term, or both.',
        'any.required': 'Listing type is required.',
      }),

    propertyType: Joi.string()
      .valid('apartment', 'house', 'villa', 'condo', 'guest_house', 'shared_room', 'serviced_apartment')
      .required()
      .messages({
        'any.only': 'Invalid property type.',
        'any.required': 'Property type is required.',
      }),

    bedrooms: Joi.number()
      .integer()
      .min(0)
      .max(50)
      .default(1)
      .optional(),

    bathrooms: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(1)
      .optional(),

    maxGuests: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(1)
      .optional(),

    bedsCount: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(1)
      .optional(),

    pricePerNight: Joi.number()
      .positive()
      .precision(2)
      .optional()
      .allow(null)
      .messages({
        'number.positive': 'Price per night must be a positive number.',
        'number.precision': 'Price can have at most 2 decimal places.',
      }),

    pricePerMonth: Joi.number()
      .positive()
      .precision(2)
      .optional()
      .allow(null)
      .messages({
        'number.positive': 'Price per month must be a positive number.',
        'number.precision': 'Price can have at most 2 decimal places.',
      }),

    cleaningFee: Joi.number()
      .min(0)
      .precision(2)
      .default(0)
      .optional(),

    securityDeposit: Joi.number()
      .min(0)
      .precision(2)
      .default(0)
      .optional(),

    weeklyDiscountPercent: Joi.number()
      .integer()
      .min(0)
      .max(99)
      .default(0)
      .optional(),

    monthlyDiscountPercent: Joi.number()
      .integer()
      .min(0)
      .max(99)
      .default(0)
      .optional(),

    streetAddress: Joi.string()
      .trim()
      .min(5)
      .max(500)
      .required()
      .messages({
        'string.min': 'Street address must be at least 5 characters.',
        'string.max': 'Street address must be less than 500 characters.',
        'any.required': 'Street address is required.',
      }),

    city: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'City must be at least 2 characters.',
        'string.max': 'City must be less than 100 characters.',
        'any.required': 'City is required.',
      }),

    region: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow(null, ''),

    subcity: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow(null, ''),

    wereda: Joi.string()
      .trim()
      .max(50)
      .optional()
      .allow(null, ''),

    latitude: Joi.number()
      .min(-90)
      .max(90)
      .optional()
      .allow(null),

    longitude: Joi.number()
      .min(-180)
      .max(180)
      .optional()
      .allow(null),

    nearbyLandmarks: Joi.string()
      .max(1000)
      .optional()
      .allow(null, ''),

    instantBook: Joi.boolean()
      .default(false)
      .optional(),

    minNights: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(1)
      .optional(),

    maxNights: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .optional()
      .allow(null),

    checkInTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
      .default('14:00')
      .optional()
      .messages({
        'string.pattern.base': 'Check-in time must be in HH:MM format (24-hour).',
      }),

    checkOutTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
      .default('11:00')
      .optional()
      .messages({
        'string.pattern.base': 'Check-out time must be in HH:MM format (24-hour).',
      }),

    houseRules: Joi.string()
      .max(3000)
      .optional()
      .allow(null, ''),

    cancellationPolicy: Joi.string()
      .valid('flexible', 'moderate', 'strict')
      .default('flexible')
      .optional()
      .messages({
        'any.only': 'Cancellation policy must be flexible, moderate, or strict.',
      }),

    amenities: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().min(1).max(100).required(),
          category: Joi.string().max(50).optional().allow(null, ''),
          iconName: Joi.string().max(100).optional().allow(null, ''),
        })
      )
      .max(50)
      .optional()
      .messages({
        'array.max': 'Maximum 50 amenities allowed.',
      }),
  }),

  /**
   * Update listing validation schema.
   * All fields are optional - only provided fields are updated.
   */
  updateListing: Joi.object({
    title: Joi.string().trim().min(5).max(255).optional(),
    description: Joi.string().trim().min(20).max(5000).optional(),
    listingType: Joi.string().valid('short_term', 'long_term', 'both').optional(),
    propertyType: Joi.string().valid('apartment', 'house', 'villa', 'condo', 'guest_house', 'shared_room', 'serviced_apartment').optional(),
    bedrooms: Joi.number().integer().min(0).max(50).optional(),
    bathrooms: Joi.number().integer().min(1).max(50).optional(),
    maxGuests: Joi.number().integer().min(1).max(100).optional(),
    bedsCount: Joi.number().integer().min(1).max(100).optional(),
    pricePerNight: Joi.number().positive().precision(2).optional().allow(null),
    pricePerMonth: Joi.number().positive().precision(2).optional().allow(null),
    cleaningFee: Joi.number().min(0).precision(2).optional(),
    securityDeposit: Joi.number().min(0).precision(2).optional(),
    weeklyDiscountPercent: Joi.number().integer().min(0).max(99).optional(),
    monthlyDiscountPercent: Joi.number().integer().min(0).max(99).optional(),
    streetAddress: Joi.string().trim().min(5).max(500).optional(),
    city: Joi.string().trim().min(2).max(100).optional(),
    region: Joi.string().trim().max(100).optional().allow(null, ''),
    subcity: Joi.string().trim().max(100).optional().allow(null, ''),
    wereda: Joi.string().trim().max(50).optional().allow(null, ''),
    latitude: Joi.number().min(-90).max(90).optional().allow(null),
    longitude: Joi.number().min(-180).max(180).optional().allow(null),
    nearbyLandmarks: Joi.string().max(1000).optional().allow(null, ''),
    instantBook: Joi.boolean().optional(),
    minNights: Joi.number().integer().min(1).max(365).optional(),
    maxNights: Joi.number().integer().min(1).max(365).optional().allow(null),
    checkInTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    checkOutTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    houseRules: Joi.string().max(3000).optional().allow(null, ''),
    cancellationPolicy: Joi.string().valid('flexible', 'moderate', 'strict').optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update.',
  }),

  /**
   * Listing search query validation.
   * Supports extensive filtering by location, price, type, amenities, and more.
   */
  searchListings: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(12).optional(),
    city: Joi.string().max(100).optional(),
    listingType: Joi.string().valid('short_term', 'long_term').optional(),
    propertyType: Joi.string().valid('apartment', 'house', 'villa', 'condo', 'guest_house', 'shared_room', 'serviced_apartment').optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    guests: Joi.number().integer().min(1).optional(),
    bedrooms: Joi.number().integer().min(1).optional(),
    bathrooms: Joi.number().integer().min(1).optional(),
    amenities: Joi.string().optional(),
    instantBook: Joi.boolean().optional(),
    search: Joi.string().max(200).optional(),
    sortBy: Joi.string().valid('created_at', 'price_per_night', 'price_per_month', 'view_count', 'bedrooms').default('created_at').optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC').optional(),
  }),

  /**
   * URL params validation for routes with listing ID.
   */
  listingIdParam: Joi.object({
    id: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid listing ID format.',
        'any.required': 'Listing ID is required.',
      }),
  }),
};

module.exports = listingValidator;