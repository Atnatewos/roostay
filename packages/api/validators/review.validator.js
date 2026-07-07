// packages/api/validators/review.validator.js
// Joi validation schemas for review endpoints
// Validates review creation with 5-category ratings and host responses

const Joi = require('joi');

const reviewValidator = {
  /**
   * Create review validation schema.
   * All five rating categories are required, each on a 1-5 scale.
   */
  createReview: Joi.object({
    bookingId: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid booking ID format.',
        'any.required': 'Booking ID is required.',
      }),

    cleanliness: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.min': 'Cleanliness rating must be between 1 and 5.',
        'number.max': 'Cleanliness rating must be between 1 and 5.',
        'any.required': 'Cleanliness rating is required.',
      }),

    accuracy: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.min': 'Accuracy rating must be between 1 and 5.',
        'number.max': 'Accuracy rating must be between 1 and 5.',
        'any.required': 'Accuracy rating is required.',
      }),

    communication: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.min': 'Communication rating must be between 1 and 5.',
        'number.max': 'Communication rating must be between 1 and 5.',
        'any.required': 'Communication rating is required.',
      }),

    location: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.min': 'Location rating must be between 1 and 5.',
        'number.max': 'Location rating must be between 1 and 5.',
        'any.required': 'Location rating is required.',
      }),

    value: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.min': 'Value rating must be between 1 and 5.',
        'number.max': 'Value rating must be between 1 and 5.',
        'any.required': 'Value rating is required.',
      }),

    reviewText: Joi.string()
      .trim()
      .max(3000)
      .optional()
      .allow(null, '')
      .messages({
        'string.max': 'Review text must be less than 3000 characters.',
      }),
  }),

  /**
   * Host response validation schema.
   */
  addHostResponse: Joi.object({
    responseText: Joi.string()
      .trim()
      .min(1)
      .max(3000)
      .required()
      .messages({
        'string.min': 'Response text cannot be empty.',
        'string.max': 'Response text must be less than 3000 characters.',
        'any.required': 'Response text is required.',
      }),
  }),

  /**
   * Listing reviews query validation.
   */
  getListingReviews: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(10).optional(),
  }),

  /**
   * URL params validation for routes with review ID.
   */
  reviewIdParam: Joi.object({
    id: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid review ID format.',
        'any.required': 'Review ID is required.',
      }),
  }),
};

module.exports = reviewValidator;