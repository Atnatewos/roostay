// packages/api/routes/health.routes.js
// Public health check endpoint for monitoring and load balancers
const express = require('express');
const router = express.Router();

/**
 * GET /api/health
 * Returns API status, timestamp, and current environment.
 * Used by Vercel, UptimeRobot, or internal monitoring tools.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ROOSTAY API is running.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;