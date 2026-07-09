// packages/api/validators/payment.validator.js
// Joi validation schemas for payment endpoints
// Validates transaction number validation, payment creation, and proof upload
const Joi = require('joi');

const paymentValidator = {
  /**
   * Transaction number validation schema.
   * Validates that the transaction number is unique and not previously used.
   */
  validateTransaction: Joi.object({
    transactionNumber: Joi.string()
      .trim()
      .min(3)
      .max(255)
      .required()
      .messages({
        'string.min': 'Transaction number must be at least 3 characters.',
        'string.max': 'Transaction number must be less than 255 characters.',
        'any.required': 'Transaction number is required.',
        'string.empty': 'Transaction number cannot be empty.',
      }),
  }),

  /**
   * Payment creation validation schema.
   * Validates booking ID and payment method.
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
      .valid('bank_transfer', 'telebirr', 'cash', 'other')
      .default('bank_transfer')
      .messages({
        'any.only': 'Payment method must be bank_transfer, telebirr, cash, or other.',
      }),
  }),

  /**
   * Payment proof upload validation schema.
   * Validates proof image URL and optional notes.
   */
  uploadPaymentProof: Joi.object({
    proofImageUrl: Joi.string()
      .uri()
      .required()
      .messages({
        'string.uri': 'Proof image must be a valid URL.',
        'any.required': 'Proof image URL is required.',
      }),
    notes: Joi.string()
      .max(1000)
      .optional()
      .allow(null, '')
      .messages({
        'string.max': 'Notes must be less than 1000 characters.',
      }),
  }),

  /**
   * Payment verification validation schema (admin only).
   * Validates verify or reject action with optional reason.
   */
  verifyPayment: Joi.object({
    action: Joi.string()
      .valid('verify', 'reject')
      .required()
      .messages({
        'any.only': 'Action must be verify or reject.',
        'any.required': 'Action is required.',
      }),
    reason: Joi.string()
      .max(1000)
      .optional()
      .allow(null, '')
      .when('action', {
        is: 'reject',
        then: Joi.string().max(1000).required().messages({
          'any.required': 'Rejection reason is required.',
        }),
      })
      .messages({
        'string.max': 'Reason must be less than 1000 characters.',
      }),
  }),

  /**
   * Payment listing validation schema (admin only).
   * Validates query parameters for listing payments.
   */
  listPayments: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(20).optional(),
    status: Joi.string()
      .valid('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'pending_review')
      .optional(),
    paymentMethod: Joi.string()
      .valid('bank_transfer', 'telebirr', 'cash', 'other')
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