// packages/api/controllers/booking.controller.js
// Booking controller - handles HTTP requests for booking endpoints
// Supports booking creation with payment, status management, and availability checks
const bookingService = require('../../services/booking.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const bookingController = {
  /**
   * POST /api/bookings
   * Creates a new booking with payment information.
   * Body: { listingId, checkInDate, checkOutDate, guestCount, bookingType, paymentMethod, transactionNumber, specialRequests?, proofNotes? }
   */
  createBooking: asyncHandler(async (req, res) => {
    const result = await bookingService.createBooking(req.user.id, req.body);
    
    logger.info('Booking created via API', {
      bookingId: result.booking.id,
      paymentId: result.payment.id,
      guestId: req.user.id,
      listingId: req.body.listingId,
    });
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Payment is being processed.',
      data: result,
    });
  }),

  /**
   * GET /api/bookings/:id
   * Returns full booking details by ID.
   * Accessible by guest, host, or admin.
   */
  getBookingById: asyncHandler(async (req, res) => {
    const booking = await bookingService.getBookingById(
      req.params.id,
      req.user.id,
      req.user.role
    );
    
    res.status(200).json({
      success: true,
      data: { booking },
    });
  }),

  /**
   * PATCH /api/bookings/:id/status
   * Updates the status of a booking.
   * Body: { status, cancellationReason? }
   */
  updateBookingStatus: asyncHandler(async (req, res) => {
    const { status, cancellationReason } = req.body;
    const booking = await bookingService.updateBookingStatus(
      req.params.id,
      req.user.id,
      req.user.role,
      status,
      cancellationReason
    );
    
    logger.info('Booking status updated via API', {
      bookingId: req.params.id,
      newStatus: status,
      userId: req.user.id,
    });
    
    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully.`,
      data: { booking },
    });
  }),

  /**
   * GET /api/bookings/guest
   * Returns bookings for the authenticated guest.
   * Query: { page, limit, status }
   */
  getGuestBookings: asyncHandler(async (req, res) => {
    const result = await bookingService.getUserBookings(req.user.id, 'guest', req.query);
    
    res.status(200).json({
      success: true,
      data: result.bookings,
      pagination: result.pagination,
    });
  }),

  /**
   * GET /api/bookings/host
   * Returns bookings for the authenticated host's listings.
   * Query: { page, limit, status }
   */
  getHostBookings: asyncHandler(async (req, res) => {
    const result = await bookingService.getUserBookings(req.user.id, 'host', req.query);
    
    res.status(200).json({
      success: true,
      data: result.bookings,
      pagination: result.pagination,
    });
  }),

  /**
   * GET /api/listings/:id/availability
   * Checks availability for a listing on specific dates.
   * Query: { checkInDate, checkOutDate }
   */
  checkAvailability: asyncHandler(async (req, res) => {
    const { checkInDate, checkOutDate } = req.query;
    const result = await bookingService.checkAvailability(
      req.params.id,
      checkInDate,
      checkOutDate
    );
    
    res.status(200).json({
      success: true,
      data: result,
    });
  }),
};

module.exports = bookingController;