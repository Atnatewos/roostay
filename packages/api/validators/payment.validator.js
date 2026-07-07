// packages/api/validators/payment.validator.js
// Joi validation schemas for payment endpoints
// Validates payment creation, proof upload, and admin verification

const Joi = require('joi');

const paymentValidator = {
  /**
   * Create payment validation schema.
   */
  createPayment: Joi.object({
    bookingId: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid booking ID format.',
        'any.required': 'Booking ID is required.',
      }),

    paymentMethod: Joi.string()
      .valid('bank_transfer', 'telebirr')
      .default('bank_transfer')
      .optional()
      .messages({
        'any.only': 'Payment method must be bank_transfer or telebirr.',
      }),
  }),

  /**
   * Payment proof upload validation schema.
   */
  uploadPaymentProof: Joi.object({
    proofImageUrl: Joi.string()
      .uri()
      .required()
      .messages({
        'string.uri': 'Proof image must be a valid URL.',
        'any.required': 'Payment proof image URL is required.',
      }),

    notes: Joi.string()
      .max(500)
      .optional()
      .allow(null, '')
      .messages({
        'string.max': 'Notes must be less than 500 characters.',
      }),
  }),

  /**
   * Payment verification validation schema (admin).
   */
  verifyPayment: Joi.object({
    action: Joi.string()
      .valid('verify', 'reject')
      .required()
      .messages({
        'any.only': 'Action must be "verify" or "reject".',
        'any.required': 'Action is required.',
      }),

    reason: Joi.string()
      .max(1000)
      .optional()
      .allow(null, '')
      .when('action', {
        is: 'reject',
        then: Joi.string().max(1000).optional().messages({
          'string.max': 'Rejection reason must be less than 1000 characters.',
        }),
      }),
  }),

  /**
   * Payment listing query validation (admin).
   */
  listPayments: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    status: Joi.string()
      .valid('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')
      .optional(),
    paymentMethod: Joi.string()
      .valid('bank_transfer', 'telebirr')
      .optional(),
  }),

  /**
   * URL params validation for routes with payment ID.
   */
  paymentIdParam: Joi.object({
    id: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid payment ID format.',
        'any.required': 'Payment ID is required.',
      }),
  }),
};

module.exports = paymentValidator;