// packages/api/validators/favorite.validator.js
// Validation schemas for favorite-related endpoints

const Joi = require('joi');

const favoriteValidator = {
  /**
   * Validates the listing ID parameter for favorite routes.
   * Ensures the parameter is a valid UUIDv4 string.
   */
  listingIdParam: Joi.object({
    id: Joi.string().guid({ version: 'uuidv4' }).required().messages({
      'string.guid': 'Listing ID must be a valid UUID',
      'any.required': 'Listing ID is required',
    }),
  }),
};

module.exports = favoriteValidator;