// packages/api/validators/auth.validator.js
// Joi validation schemas for authentication endpoints
// Validates registration, login, token refresh, and password change requests
// All field requirements and constraints come from auth config

const Joi = require('joi');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    auth: {
      passwordMinLength: 8,
      passwordMaxLength: 128,
    },
  };
}

const authValidator = {
  /**
   * Registration validation schema.
   * Email and password are required. Phone number is optional but validated if provided.
   * Names are trimmed and have length limits to prevent abuse.
   */
  register: Joi.object({
    email: Joi.string()
      .email()
      .max(255)
      .required()
      .messages({
        'string.email': 'Please provide a valid email address.',
        'string.max': 'Email must be less than 256 characters.',
        'any.required': 'Email is required.',
      }),

    password: Joi.string()
      .min(config.auth.passwordMinLength || 8)
      .max(config.auth.passwordMaxLength || 128)
      .pattern(/[a-z]/, 'lowercase')
      .pattern(/[A-Z]/, 'uppercase')
      .pattern(/[0-9]/, 'number')
      .required()
      .messages({
        'string.min': `Password must be at least ${config.auth.passwordMinLength || 8} characters.`,
        'string.max': `Password must be less than ${config.auth.passwordMaxLength || 128} characters.`,
        'string.pattern.name': 'Password must contain at least one {#name} character.',
        'any.required': 'Password is required.',
      }),

    firstName: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'First name is required.',
        'string.max': 'First name must be less than 100 characters.',
        'any.required': 'First name is required.',
      }),

    lastName: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'Last name is required.',
        'string.max': 'Last name must be less than 100 characters.',
        'any.required': 'Last name is required.',
      }),

    phoneNumber: Joi.string()
      .pattern(/^(\+251|0)[9]\d{8}$/)
      .optional()
      .allow(null, '')
      .messages({
        'string.pattern.base': 'Please provide a valid Ethiopian phone number (09XXXXXXXX or +2519XXXXXXXX).',
      }),
  }),

  /**
   * Login validation schema.
   * Accepts email and password only.
   */
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address.',
        'any.required': 'Email is required.',
      }),

    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required.',
      }),
  }),

  /**
   * Token refresh validation schema.
   * Requires a valid refresh token string.
   */
  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required.',
      }),
  }),

  /**
   * Password change validation schema.
   * Requires current password and new password with confirmation.
   */
  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required.',
      }),

    newPassword: Joi.string()
      .min(config.auth.passwordMinLength || 8)
      .max(config.auth.passwordMaxLength || 128)
      .pattern(/[a-z]/, 'lowercase')
      .pattern(/[A-Z]/, 'uppercase')
      .pattern(/[0-9]/, 'number')
      .required()
      .messages({
        'string.min': `New password must be at least ${config.auth.passwordMinLength || 8} characters.`,
        'string.max': `New password must be less than ${config.auth.passwordMaxLength || 128} characters.`,
        'string.pattern.name': 'New password must contain at least one {#name} character.',
        'any.required': 'New password is required.',
      }),

    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Passwords do not match.',
        'any.required': 'Password confirmation is required.',
      }),
  }),
};

module.exports = authValidator;