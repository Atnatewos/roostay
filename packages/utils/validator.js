// packages/utils/validator.js
// Validation utility for request data using Joi
// Provides a consistent interface for validating request body, query, and params
// Integrates with the validate middleware for Express route validation

const Joi = require('joi');
const { ValidationError } = require('./errors');

/**
 * Validates data against a Joi schema and throws a ValidationError on failure.
 * All validation errors include the specific field-level details.
 *
 * @param {Object} data - The data to validate
 * @param {Joi.Schema} schema - The Joi validation schema
 * @param {string} [source='body'] - Source of the data (for error messages)
 * @returns {Object} The validated (and sanitized) data
 * @throws {ValidationError} When validation fails
 */
function validate(data, schema, source = 'body') {
  if (!schema) {
    return data;
  }

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
  });

  if (error) {
    const details = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      details[key] = detail.message;
    });

    throw new ValidationError(
      `Validation failed for ${source}`,
      details
    );
  }

  return value;
}

/**
 * Common Joi reusable validation patterns.
 * These can be composed to build complex validation schemas.
 */
const patterns = {
  /**
   * Email validation - must be a valid email format, max 255 chars.
   */
  email: Joi.string()
    .email()
    .max(255)
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email must be less than 255 characters',
    }),

  /**
   * Password validation - configurable min/max from auth config.
   * Must contain at least one uppercase, one lowercase, and one number.
   */
  password: (minLength = 8, maxLength = 128) =>
    Joi.string()
      .min(minLength)
      .max(maxLength)
      .pattern(/[a-z]/, 'lowercase')
      .pattern(/[A-Z]/, 'uppercase')
      .pattern(/[0-9]/, 'number')
      .messages({
        'string.min': `Password must be at least ${minLength} characters`,
        'string.max': `Password must be less than ${maxLength} characters`,
        'string.pattern.name': 'Password must contain at least one {#name} character',
      }),

  /**
   * Phone number - Ethiopian format: 09XXXXXXXX or +2519XXXXXXXX.
   */
  phoneNumber: Joi.string()
    .pattern(/^(\+251|0)[9]\d{8}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid Ethiopian phone number',
    }),

  /**
   * MongoDB/ObjectId-like UUID or ID pattern.
   */
  objectId: Joi.string()
    .pattern(/^[a-f0-9-]{36}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid ID',
    }),

  /**
   * Price validation - positive number with up to 2 decimal places.
   */
  price: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.positive': 'Price must be a positive number',
      'number.precision': 'Price can have at most 2 decimal places',
    }),

  /**
   * Date validation - ISO date string in the future.
   */
  futureDate: Joi.date()
    .iso()
    .greater('now')
    .messages({
      'date.greater': 'Date must be in the future',
      'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
    }),

  /**
   * Pagination parameters.
   */
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(12),
  },
};

module.exports = {
  validate,
  patterns,
};