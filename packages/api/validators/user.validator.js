// packages/api/validators/user.validator.js
// Joi validation schemas for user profile endpoints
// Handles profile updates with optional field validation

const Joi = require('joi');

const userValidator = {
  /**
   * Profile update validation schema.
   * All fields are optional - only provided fields are updated.
   * Phone number follows Ethiopian format when provided.
   */
  updateProfile: Joi.object({
    firstName: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .messages({
        'string.min': 'First name cannot be empty.',
        'string.max': 'First name must be less than 100 characters.',
      }),

    lastName: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Last name cannot be empty.',
        'string.max': 'Last name must be less than 100 characters.',
      }),

    phoneNumber: Joi.string()
      .pattern(/^(\+251|0)[9]\d{8}$/)
      .optional()
      .allow(null, '')
      .messages({
        'string.pattern.base': 'Please provide a valid Ethiopian phone number.',
      }),

    profileImageUrl: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Profile image must be a valid URL.',
      }),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update.',
    }),

  /**
   * User listing query validation (admin).
   * Supports filtering by role, verification, active status, and search.
   */
  listUsers: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .optional(),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .optional(),

    role: Joi.string()
      .valid('guest', 'host', 'admin')
      .optional(),

    isVerified: Joi.boolean()
      .optional(),

    isActive: Joi.boolean()
      .optional(),

    search: Joi.string()
      .max(100)
      .optional(),
  }),
};

module.exports = userValidator;