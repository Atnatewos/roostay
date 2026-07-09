// packages/utils/cron.js
// Cron job scheduler for automated tasks
// Handles booking expiry, cleanup, and maintenance tasks
// Uses node-cron for scheduling
const cron = require('node-cron');
const bookingService = require('../services/booking.service');
const logger = require('./logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    app: {
      env: process.env.NODE_ENV || 'development',
    },
  };
}

/**
 * Initializes all cron jobs for the application.
 * Runs automated tasks on specified schedules.
 */
function initCronJobs() {
  logger.info('Initializing cron jobs', {
    environment: config.app.env,
  });

  // ============================================================================
  // BOOKING EXPIRY JOB - Runs every 5 minutes
  // Expires unpaid bookings that have exceeded their payment timeout
  // ============================================================================
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.debug('Running booking expiry cron job');
      const result = await bookingService.expireUnpaidBookings();
      
      if (result.expired > 0) {
        logger.info('Booking expiry job completed', {
          expiredCount: result.expired,
        });
      }
    } catch (error) {
      logger.error('Booking expiry cron job failed', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  logger.info('Cron jobs initialized successfully');
}

/**
 * Manually triggers the booking expiry job (for testing).
 * @returns {Promise<Object>} Expiry result
 */
async function triggerBookingExpiry() {
  return await bookingService.expireUnpaidBookings();
}

module.exports = {
  initCronJobs,
  triggerBookingExpiry,
};