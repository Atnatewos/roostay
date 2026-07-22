// packages/services/index.js
// Barrel export for all service modules
// Provides a single import point for all business logic services
// Author: Theron

const userService = require('./user.service');
const listingService = require('./listing.service');
const bookingService = require('./booking.service');
const paymentService = require('./payment.service');
const reviewService = require('./review.service');
const favoriteService = require('./favorite.service');
const notificationService = require('./notification.service');
const adminService = require('./admin.service');
const hostApplicationService = require('./hostApplication.service');
const withdrawalService = require('./withdrawal.service');
const messageService = require('./message.service');
const pricingService = require('./pricing.service');

module.exports = {
  userService,
  listingService,
  bookingService,
  paymentService,
  reviewService,
  favoriteService,
  notificationService,
  adminService,
  hostApplicationService,
  withdrawalService,
  messageService,
  pricingService,
};