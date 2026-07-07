// packages/api/validators/booking.validator.js
// Joi validation schemas for booking endpoints
// Validates booking creation, status updates, and availability checks

const Joi = require('joi');

const bookingValidator = {
  /**
   * Create booking validation schema.
   * Validates dates, guest count, and booking type.
   * Check-in must be a future date, check-out must be after check-in.
   */
  createBooking: Joi.object({
    listingId: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid listing ID format.',
        'any.required': 'Listing ID is required.',
      }),

    checkInDate: Joi.date()
      .iso()
      .greater('now')
      .required()
      .messages({
        'date.greater': 'Check-in date must be in the future.',
        'date.format': 'Check-in date must be in ISO format (YYYY-MM-DD).',
        'any.required': 'Check-in date is required.',
      }),

    checkOutDate: Joi.date()
      .iso()
      .greater(Joi.ref('checkInDate'))
      .required()
      .messages({
        'date.greater': 'Check-out date must be after check-in date.',
        'date.format': 'Check-out date must be in ISO format (YYYY-MM-DD).',
        'any.required': 'Check-out date is required.',
      }),

    guestCount: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(1)
      .optional()
      .messages({
        'number.min': 'Guest count must be at least 1.',
        'number.max': 'Guest count cannot exceed 100.',
      }),

    bookingType: Joi.string()
      .valid('short_term', 'long_term')
      .required()
      .messages({
        'any.only': 'Booking type must be short_term or long_term.',
        'any.required': 'Booking type is required.',
      }),

    specialRequests: Joi.string()
      .max(2000)
      .optional()
      .allow(null, '')
      .messages({
        'string.max': 'Special requests must be less than 2000 characters.',
      }),
  }),

  /**
   * Booking status update validation schema.
   * Supports confirm, cancel, complete, and reject actions.
   */
  updateBookingStatus: Joi.object({
    status: Joi.string()
      .valid('confirmed', 'cancelled', 'completed', 'rejected')
      .required()
      .messages({
        'any.only': 'Status must be confirmed, cancelled, completed, or rejected.',
        'any.required': 'New status is required.',
      }),

    cancellationReason: Joi.string()
      .max(1000)
      .optional()
      .allow(null, '')
      .when('status', {
        is: 'cancelled',
        then: Joi.string().max(1000).optional(),
      }),
  }),

  /**
   * Availability check validation schema.
   */
  checkAvailability: Joi.object({
    listingId: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid listing ID format.',
        'any.required': 'Listing ID is required.',
      }),

    checkInDate: Joi.date()
      .iso()
      .required()
      .messages({
        'date.format': 'Check-in date must be in ISO format (YYYY-MM-DD).',
        'any.required': 'Check-in date is required.',
      }),

    checkOutDate: Joi.date()
      .iso()
      .greater(Joi.ref('checkInDate'))
      .required()
      .messages({
        'date.greater': 'Check-out date must be after check-in date.',
        'date.format': 'Check-out date must be in ISO format (YYYY-MM-DD).',
        'any.required': 'Check-out date is required.',
      }),
  }),

  /**
   * User bookings query validation.
   */
  getUserBookings: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(20).optional(),
    status: Joi.string()
      .valid('pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired')
      .optional(),
  }),

  /**
   * URL params validation for routes with booking ID.
   */
  bookingIdParam: Joi.object({
    id: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid booking ID format.',
        'any.required': 'Booking ID is required.',
      }),
  }),
};

module.exports = bookingValidator;