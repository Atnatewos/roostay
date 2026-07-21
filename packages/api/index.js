// packages/api/index.js
// Express application factory for ROOSTAY API
// Creates and configures the Express app with all middleware and route modules
// Designed to be imported by the Next.js API route handler for Vercel deployment
// Can also run standalone for local development via startServer()
// Author: Theron

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import modular route aggregator — mounts all domain routes at /api
const createRoutes = require('./routes');

// Import error handling middleware
const { errorHandler, notFoundHandler } = require('../utils/errorHandler');

// Import middleware modules
const { authenticate, optionalAuth } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const rateLimiter = require('../middleware/rateLimiter');

// Import configuration — loaded from JSON config files with env var resolution
let config;
try {
  config = require('@roostay/config');
} catch {
  // Fallback for when workspace alias is unavailable
  config = require('../config');
}

// Import database for notification queries
const { query } = require('../database');

// Import utilities
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Creates and fully configures the Express application.
 * Registers security middleware, parsing middleware, API routes, and error handlers.
 * The app is designed to be mounted in Next.js API routes or run standalone.
 * 
 * Middleware stack order:
 * 1. Trust proxy — correct IP detection behind Vercel's reverse proxy
 * 2. Helmet — security headers
 * 3. CORS — cross-origin resource sharing
 * 4. JSON parsing — request body parsing with size limit
 * 5. URL-encoded parsing — form data parsing
 * 6. Cookie parsing — httpOnly cookie authentication
 * 7. API routes — all domain routes mounted at /api
 * 8. Root endpoint — API information
 * 9. 404 handler — unmatched routes
 * 10. Error handler — global error catching
 *
 * @returns {express.Application} Fully configured Express application
 */
function createApp() {
  const app = express();

  // ============================================================================
  // TRUST PROXY
  // Required for correct client IP detection behind Vercel's reverse proxy
  // ============================================================================
  app.set('trust proxy', 1);

  // ============================================================================
  // SECURITY MIDDLEWARE
  // ============================================================================

  // Helmet — sets various HTTP security headers to protect against common attacks
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));

  // CORS — allows cross-origin requests from configured origins
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  // ============================================================================
  // PARSING MIDDLEWARE
  // ============================================================================

  // Parse JSON request bodies with a 10MB size limit
  app.use(express.json({ limit: '10mb' }));

  // Parse URL-encoded form data with a 10MB size limit
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Parse cookies — required for httpOnly cookie authentication
  app.use(cookieParser());

  // ============================================================================
  // API ROUTES
  // All domain routes are mounted under the /api prefix
  // Each route module handles its own authentication and validation middleware
  // ============================================================================
  app.use('/api', createRoutes());

  // ============================================================================
  // NOTIFICATION ROUTE
  // Defined here as it uses the inline query function directly
  // ============================================================================
  app.get(
    '/api/notifications',
    authenticate,
    asyncHandler(async (req, res) => {
      const result = await query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [req.user.id]
      );
      res.json({
        success: true,
        data: {
          notifications: result.rows,
          unreadCount: result.rows.filter((n) => !n.is_read).length,
        },
      });
    })
  );

  // ============================================================================
  // ROOT ENDPOINT
  // Provides API metadata for discovery and health monitoring
  // ============================================================================
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      name: 'ROOSTAY API',
      version: '1.0.0',
      environment: config.app.env,
      documentation: '/api/health',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        listings: '/api/listings',
        bookings: '/api/bookings',
        payments: '/api/payments',
        withdrawals: '/api/withdrawals',
        reviews: '/api/reviews',
        favorites: '/api/favorites',
        notifications: '/api/notifications',
        admin: '/api/admin',
        upload: '/api/upload',
      },
    });
  });

  // ============================================================================
  // 404 HANDLER
  // Catches all requests that don't match any registered route
  // Uses regex pattern for path-to-regexp v8 compatibility
  // ============================================================================
  app.all(/.*/, (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route not found: ${req.method} ${req.path}`,
      },
    });
  });

  // ============================================================================
  // GLOBAL ERROR HANDLER
  // Catches all errors thrown in route handlers and middleware
  // Returns structured JSON error responses with appropriate status codes
  // ============================================================================
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal server error';
    console.error(`[${statusCode}] ${err.message}`);
    res.status(statusCode).json({
      success: false,
      error: {
        code: err.errorCode || 'INTERNAL_ERROR',
        message,
      },
    });
  });

  return app;
}

/**
 * Starts the Express server on the configured port for standalone development.
 * Used when running the API independently without Next.js (e.g., node server.js).
 * 
 * @returns {express.Application} The started Express application
 */
function startServer() {
  const app = createApp();
  const port = config.app.port || 3001;

  app.listen(port, () => {
    logger.info('ROOSTAY API server started', {
      port,
      environment: config.app.env,
      url: `http://localhost:${port}`,
    });
  });

  return app;
}

// Start the server if this file is executed directly (not imported as a module)
if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
};