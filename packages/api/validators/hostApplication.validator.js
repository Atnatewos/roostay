// packages/api/validators/hostApplication.validator.js
// Joi validation schemas for host application endpoints
// Validates identity documents and hosting experience data
// Author: Theron

const Joi = require('joi');

const hostApplicationValidator = {
  /**
   * Host application submission schema.
   * Validates identity type, ID number, document images, and experience details.
   */
  apply: Joi.object({
    idType: Joi.string()
      .valid('kebele_id', 'passport', 'drivers_license', 'national_id')
      .required()
      .messages({
        'any.only': 'ID type must be one of: kebele_id, passport, drivers_license, national_id.',
        'any.required': 'ID type is required.',
      }),

    idNumber: Joi.string()
      .trim()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'ID number must be at least 3 characters.',
        'string.max': 'ID number must be less than 100 characters.',
        'any.required': 'ID number is required.',
      }),

    idFrontImageUrl: Joi.string()
      .uri()
      .required()
      .messages({
        'string.uri': 'Front ID image must be a valid URL.',
        'any.required': 'Front ID image URL is required.',
      }),

    idBackImageUrl: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Back ID image must be a valid URL.',
      }),

    hostingExperience: Joi.string()
      .valid('yes', 'no')
      .required()
      .messages({
        'any.only': 'Hosting experience must be "yes" or "no".',
        'any.required': 'Hosting experience is required.',
      }),

    propertyCount: Joi.string()
      .valid('1-2', '3-5', '5+')
      .required()
      .messages({
        'any.only': 'Property count must be one of: 1-2, 3-5, 5+.',
        'any.required': 'Property count is required.',
      }),

    motivation: Joi.string()
      .trim()
      .max(2000)
      .optional()
      .allow(null, '')
      .messages({
        'string.max': 'Motivation must be less than 2000 characters.',
      }),
  }),
};

module.exports = hostApplicationValidator;
