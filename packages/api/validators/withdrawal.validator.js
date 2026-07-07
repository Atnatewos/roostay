// packages/api/validators/withdrawal.validator.js
// Joi validation schemas for withdrawal/payout endpoints
// Validates withdrawal requests and admin processing

const Joi = require('joi');

const withdrawalValidator = {
  /**
   * Request withdrawal validation schema.
   * Bank details required for bank_transfer method.
   */
  requestWithdrawal: Joi.object({
    amount: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.positive': 'Amount must be a positive number.',
        'number.precision': 'Amount can have at most 2 decimal places.',
        'any.required': 'Withdrawal amount is required.',
      }),

    method: Joi.string()
      .valid('bank_transfer', 'telebirr')
      .default('bank_transfer')
      .optional()
      .messages({
        'any.only': 'Withdrawal method must be bank_transfer or telebirr.',
      }),

    bankName: Joi.string()
      .trim()
      .max(255)
      .when('method', {
        is: 'bank_transfer',
        then: Joi.string().required().messages({
          'any.required': 'Bank name is required for bank transfer.',
        }),
        otherwise: Joi.string().optional().allow(null, ''),
      }),

    accountNumber: Joi.string()
      .trim()
      .max(100)
      .when('method', {
        is: 'bank_transfer',
        then: Joi.string().required().messages({
          'any.required': 'Account number is required for bank transfer.',
        }),
        otherwise: Joi.string().optional().allow(null, ''),
      }),

    accountHolder: Joi.string()
      .trim()
      .max(255)
      .when('method', {
        is: 'bank_transfer',
        then: Joi.string().required().messages({
          'any.required': 'Account holder name is required for bank transfer.',
        }),
        otherwise: Joi.string().optional().allow(null, ''),
      }),
  }),

  /**
   * Process withdrawal validation schema (admin).
   */
  processWithdrawal: Joi.object({
    action: Joi.string()
      .valid('approve', 'reject')
      .required()
      .messages({
        'any.only': 'Action must be "approve" or "reject".',
        'any.required': 'Action is required.',
      }),

    transactionReference: Joi.string()
      .max(255)
      .optional()
      .allow(null, ''),

    notes: Joi.string()
      .max(1000)
      .optional()
      .allow(null, ''),
  }),

  /**
   * Withdrawal listing query validation (admin).
   */
  listWithdrawals: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    status: Joi.string()
      .valid('pending', 'processing', 'completed', 'failed', 'cancelled')
      .optional(),
  }),

  /**
   * URL params validation for routes with withdrawal ID.
   */
  withdrawalIdParam: Joi.object({
    id: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid withdrawal ID format.',
        'any.required': 'Withdrawal ID is required.',
      }),
  }),
};

module.exports = withdrawalValidator;