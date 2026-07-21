// packages/api/routes/index.js
// Central route aggregator for the ROOSTAY API
// Imports all domain-specific route modules and mounts them on the Express router
// Each route module handles its own authentication, authorization, and validation
// Author: Theron

const express = require('express');

// Import all domain route modules
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const listingRoutes = require('./listing.routes');
const bookingRoutes = require('./booking.routes');
const paymentRoutes = require('./payment.routes');
const withdrawalRoutes = require('./withdrawal.routes');
const reviewRoutes = require('./review.routes');
const favoriteRoutes = require('./favorite.routes');
const uploadRoutes = require('./upload.routes');
const adminRoutes = require('./admin.routes');
const hostApplicationRoutes = require('./hostApplication.routes');

// Message routes are imported but mounted separately
// as they are currently in development

const router = express.Router();

/**
 * Creates and returns the fully configured API router.
 * All domain routes are mounted on the same router at their respective paths.
 * Route paths within each module are relative to the mount point.
 * 
 * Route registration order matters:
 * - Static paths must come before parameterized paths
 * - Each module handles its own middleware chain (auth, validation, rate limiting)
 *
 * @returns {express.Router} Configured Express router with all API routes
 */
function createRoutes() {
  // Health check — public endpoint for monitoring
  router.use('/', healthRoutes);

  // Authentication — register, login, logout, token refresh
  router.use('/', authRoutes);

  // User management — profile, host upgrade
  router.use('/', userRoutes);

  // Property listings — CRUD, search, availability, reviews
  router.use('/', listingRoutes);

  // Bookings — create, status management, guest/host views
  router.use('/', bookingRoutes);

  // Payments — creation, proof upload, transaction validation
  router.use('/', paymentRoutes);

  // Withdrawals — host payout requests
  router.use('/', withdrawalRoutes);

  // Reviews — guest reviews, host responses
  router.use('/', reviewRoutes);

  // Favorites — wishlist management
  router.use('/', favoriteRoutes);

  // File uploads — Cloudinary image pipeline
  router.use('/', uploadRoutes);

  // Admin panel — dashboard, moderation, user management
  router.use('/', adminRoutes);

  // Host applications — guest-to-host upgrade verification
  router.use('/', hostApplicationRoutes);

  return router;
}

module.exports = createRoutes;