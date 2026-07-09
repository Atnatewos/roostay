// packages/api/index.js
// Express application factory for ROOSTAY API
// Creates and configures the Express app with all middleware and routes
// Initializes automated cron jobs for booking expiry and maintenance tasks
// Designed to be mounted in Next.js API routes or run standalone
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Application modules
const createRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('../utils/errorHandler');
const { createCorsMiddleware, rateLimiter } = require('../middleware');
const { initCronJobs } = require('../utils/cron');
const logger = require('../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    app: {
      debug: process.env.NODE_ENV !== 'production',
      env: process.env.NODE_ENV || 'development',
    },
  };
}

/**
 * Creates and configures the Express application.
 * Registers security middleware, parsing middleware, routes, and error handlers.
 * Initializes cron jobs for automated tasks like booking expiry.
 * The app is designed to be mounted as a sub-app in Next.js or run standalone.
 * 
 * @returns {express.Application} Configured Express app
 */
function createApp() {
  const app = express();

  // ============================================================================
  // TRUST PROXY - Required for correct IP detection behind reverse proxies
  // ============================================================================
  app.set('trust proxy', 1);

  // ============================================================================
  // SECURITY MIDDLEWARE
  // ============================================================================
  
  // Helmet sets various HTTP security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Disabled for API; enable for frontend
  }));

  // CORS - Configured from cors config
  app.use(createCorsMiddleware());

  // Global rate limiting
  app.use(rateLimiter('global'));

  // ============================================================================
  // PARSING MIDDLEWARE
  // ============================================================================
  
  // Parse JSON request bodies with size limit
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      // Store raw body for webhook signature verification if needed
      req.rawBody = buf.toString();
    },
  }));

  // Parse URL-encoded request bodies
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Parse cookies for httpOnly cookie authentication
  app.use(cookieParser());

  // ============================================================================
  // LOGGING MIDDLEWARE
  // ============================================================================
  
  // HTTP request logging in development
  if (config.app.debug) {
    app.use(morgan('dev', {
      stream: {
        write: (message) => logger.debug(message.trim()),
      },
    }));
  } else {
    // Minimal logging in production
    app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
      skip: (req, res) => res.statusCode < 400, // Only log errors in production
    }));
  }

  // ============================================================================
  // REQUEST CONTEXT - Add request ID and timestamp
  // ============================================================================
  app.use((req, res, next) => {
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    req.requestStartTime = Date.now();
    
    // Add response header with request ID for debugging
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });

  // ============================================================================
  // API ROUTES
  // ============================================================================
  app.use('/api', createRoutes());

  // ============================================================================
  // INITIALIZE CRON JOBS
  // Automated tasks run on schedule (booking expiry, cleanup, etc.)
  // Only initialize once when the app is created (not on hot reload)
  // ============================================================================
  if (!global.cronJobsInitialized) {
    initCronJobs();
    global.cronJobsInitialized = true;
    logger.info('Cron jobs initialized for automated tasks');
  }

  // ============================================================================
  // ROOT ENDPOINT - API information
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
      },
    });
  });

  // ============================================================================
  // 404 HANDLER - Must be after all routes
  // ============================================================================
  app.use(notFoundHandler);

  // ============================================================================
  // ERROR HANDLER - Must be the last middleware
  // ============================================================================
  app.use(errorHandler);

  return app;
}

/**
 * Starts the Express server on the configured port.
 * Used for standalone development without Next.js.
 * 
 * @returns {express.Application} The started Express app
 */
function startServer() {
  const app = createApp();
  const port = config.app.port || 3000;

  app.listen(port, () => {
    logger.info(`ROOSTAY API server started`, {
      port,
      environment: config.app.env,
      url: `http://localhost:${port}`,
    });
  });

  return app;
}

// Start server if running directly (not imported as module)
if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
};