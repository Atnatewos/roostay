// packages/api/validators/message.validator.js
// Joi validation schemas for messaging endpoints
// Validates message content length, recipient IDs, and pagination parameters
const Joi = require('joi');

const messageValidator = {
  /**
   * Schema for sending a new message.
   * Ensures the recipient exists (via UUID format) and message text is within limits.
   */
  sendMessage: Joi.object({
    receiverId: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid recipient ID format.',
        'any.required': 'Recipient ID is required.',
      }),
    messageText: Joi.string()
      .trim()
      .min(1)
      .max(2000)
      .required()
      .messages({
        'string.min': 'Message cannot be empty.',
        'string.max': 'Message cannot exceed 2000 characters.',
        'any.required': 'Message text is required.',
      }),
    listingId: Joi.string()
      .guid({ version: 'uuidv4' })
      .optional()
      .allow(null, '')
      .messages({
        'string.guid': 'Invalid listing ID format.',
      }),
  }),

  /**
   * Schema for fetching conversation lists with pagination.
   */
  getConversations: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(20).optional(),
  }),

  /**
   * Schema for fetching messages within a specific conversation.
   */
  getConversationMessages: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(50).optional(),
  }),

  /**
   * URL parameter validation for partner ID in conversation routes.
   */
  partnerIdParam: Joi.object({
    partnerId: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid partner ID format.',
        'any.required': 'Partner ID is required.',
      }),
  }),
};

module.exports = messageValidator;