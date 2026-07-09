// packages/api/routes/index.js
// Central route aggregator for the ROOSTAY API
const express = require('express');

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const listingRoutes = require('./listing.routes');
const bookingRoutes = require('./booking.routes');
const paymentRoutes = require('./payment.routes');
const withdrawalRoutes = require('./withdrawal.routes');
const reviewRoutes = require('./review.routes');
const favoriteRoutes = require('./favorite.routes');
const notificationRoutes = require('./notification.routes');
const uploadRoutes = require('./upload.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

function createRoutes() {
  // Mount all modular routes at the root path
  router.use('/', healthRoutes);
  router.use('/', authRoutes);
  router.use('/', userRoutes);
  router.use('/', listingRoutes);
  router.use('/', bookingRoutes);
  router.use('/', paymentRoutes);
  router.use('/', withdrawalRoutes);
  router.use('/', reviewRoutes);
  router.use('/', favoriteRoutes);
  router.use('/', notificationRoutes);
  router.use('/', uploadRoutes);
  router.use('/', adminRoutes);

  return router;
}

module.exports = createRoutes;