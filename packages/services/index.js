// packages/services/index.js
// Barrel export for all service modules
// Provides a single import point for all business logic services

const userService = require('./user.service');
const listingService = require('./listing.service');
const bookingService = require('./booking.service');
const paymentService = require('./payment.service');
const withdrawalService = require('./withdrawal.service');
const reviewService = require('./review.service');
const favoriteService = require('./favorite.service');
const notificationService = require('./notification.service');
const adminService = require('./admin.service');

module.exports = {
  userService,
  listingService,
  bookingService,
  paymentService,
  withdrawalService,
  reviewService,
  favoriteService,
  notificationService,
  adminService,
};