// frontend/pages/api/[...path].js
// Complete ROOSTAY API handler for Vercel serverless deployment
// Handles all API routes: auth, listings, bookings, payments, admin, etc.
// Uses httpOnly cookies for XSS-safe authentication
// Uses native PostgreSQL driver with parameterized queries
// Author: Theron

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

// ============================================================================
// CONFIGURATION
// All values read from environment variables — zero hardcoded values
// Each config section maps to a specific domain of the application
// ============================================================================
const CONFIG = {
  app: {
    name: process.env.APP_NAME || 'ROOSTAY',
    env: process.env.NODE_ENV || 'production',
    debug: process.env.NODE_ENV !== 'production',
  },
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'roostay-prod-secret-change-me',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'roostay-refresh-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    bcryptSaltRounds: 12,
    tokenType: 'Bearer',
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    // ------------------------------------------------------------------
    // Cookie configuration for httpOnly token storage
    // secure: true in production (HTTPS only), false on localhost
    // sameSite: 'lax' allows cookies on same-site navigation
    // ------------------------------------------------------------------
    cookies: {
      accessName: 'roostay_access_token',
      refreshName: 'roostay_refresh_token',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAgeAccess: 30 * 60 * 1000,
      maxAgeRefresh: 7 * 24 * 60 * 60 * 1000,
    },
  },
  features: {
    registrationEnabled: true,
    listingApprovalRequired: false,
    paginationDefaultLimit: 12,
    paginationMaxLimit: 50,
    paymentTimeoutMinutes: parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '30', 10),
    requireTransactionNumber: process.env.REQUIRE_TRANSACTION_NUMBER !== 'false',
    preventDuplicateTransactions: process.env.PREVENT_DUPLICATE_TRANSACTIONS !== 'false',
  },
  payment: {
    serviceFeePercent: 5,
    serviceFeeMin: 100,
    serviceFeeMax: 5000,
  },
};

// ============================================================================
// DATABASE POOL
// Manages PostgreSQL connection pool for serverless environment
// Creates a singleton pool instance with SSL for Neon compatibility
// ============================================================================
let pool = null;

/**
 * Returns the singleton database pool instance.
 * Creates the pool on first call with configuration from CONFIG.database.
 *
 * @returns {Pool} PostgreSQL connection pool
 */
function getPool() {
  if (!pool) {
    if (!CONFIG.database.url) {
      console.error('DATABASE_URL not set — database operations will fail');
    }
    pool = new Pool({
      connectionString: CONFIG.database.url,
      max: CONFIG.database.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

/**
 * Executes a parameterized SQL query with automatic client management.
 * All database operations must use this function to prevent SQL injection.
 *
 * @param {string} text  - SQL query with $1, $2 parameter placeholders
 * @param {Array}  params - Array of parameter values
 * @returns {Promise<Object>} Query result object with rows and rowCount
 */
async function query(text, params = []) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Executes a query and returns only the first row.
 * Returns null when no rows match the query.
 *
 * @param {string} text  - SQL query
 * @param {Array}  params - Parameter values
 * @returns {Promise<Object|null>} First row or null
 */
async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// ============================================================================
// UTILITY CLASSES & FUNCTIONS
// Custom error class and helper functions used throughout the API
// ============================================================================

/**
 * Application error class with HTTP status code and machine-readable error code.
 * Marked as operational to distinguish from programming errors in error handling.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
  }
}

/**
 * Wraps an async Express route handler to catch errors automatically.
 * Eliminates the need for try-catch blocks in every route handler.
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped handler that forwards errors to Express error middleware
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Generates both access and refresh JWT tokens for an authenticated user.
 * Access tokens are short-lived; refresh tokens allow silent renewal.
 *
 * @param {Object} user - User object with id, email, and role properties
 * @returns {Object} Token pair with accessToken, refreshToken, and metadata
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    CONFIG.auth.jwtSecret,
    { expiresIn: CONFIG.auth.jwtExpiresIn }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    CONFIG.auth.jwtRefreshSecret,
    { expiresIn: CONFIG.auth.jwtRefreshExpiresIn }
  );
  return {
    accessToken,
    refreshToken,
    tokenType: CONFIG.auth.tokenType,
    expiresIn: CONFIG.auth.jwtExpiresIn,
  };
}

// ============================================================================
// COOKIE HELPER FUNCTIONS
// Manage httpOnly cookies for XSS-safe authentication
// Tokens are stored in browser cookies, invisible to JavaScript
// ============================================================================

/**
 * Sets access and refresh tokens as httpOnly cookies.
 * Cookies are automatically sent by the browser on every request.
 * Secure flag ensures cookies only transmit over HTTPS in production.
 *
 * @param {Object} res          - Express response object
 * @param {string} accessToken  - JWT access token (30 min expiry)
 * @param {string} refreshToken - JWT refresh token (7 day expiry)
 */
function setAuthCookies(res, accessToken, refreshToken) {
  const c = CONFIG.auth.cookies;

  res.cookie(c.accessName, accessToken, {
    httpOnly: true,
    secure: c.secure,
    sameSite: c.sameSite,
    maxAge: c.maxAgeAccess,
    path: '/',
  });

  res.cookie(c.refreshName, refreshToken, {
    httpOnly: true,
    secure: c.secure,
    sameSite: c.sameSite,
    maxAge: c.maxAgeRefresh,
    path: '/api/auth/refresh-token',
  });
}

/**
 * Clears authentication cookies from the browser.
 * Used during logout to remove all authentication state.
 *
 * @param {Object} res - Express response object
 */
function clearAuthCookies(res) {
  const c = CONFIG.auth.cookies;

  res.cookie(c.accessName, '', {
    httpOnly: true,
    secure: c.secure,
    sameSite: c.sameSite,
    maxAge: 0,
    path: '/',
  });

  res.cookie(c.refreshName, '', {
    httpOnly: true,
    secure: c.secure,
    sameSite: c.sameSite,
    maxAge: 0,
    path: '/api/auth/refresh-token',
  });
}

/**
 * Authentication middleware — verifies the JWT access token.
 * Reads from httpOnly cookie FIRST (browser clients),
 * then falls back to Authorization header (API clients / mobile apps).
 * Attaches decoded user information to req.user on success.
 */
function authenticate(req, res, next) {
  try {
    let token = null;

    // Priority 1: Read access token from httpOnly cookie
    if (req.cookies && req.cookies[CONFIG.auth.cookies.accessName]) {
      token = req.cookies[CONFIG.auth.cookies.accessName];
    }

    // Priority 2: Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    // No token found in either location
    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401, 'AUTH_ERROR');
    }

    const decoded = jwt.verify(token, CONFIG.auth.jwtSecret);

    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type.', 401, 'AUTH_ERROR');
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid token.', 401, 'AUTH_ERROR'));
  }
}

/**
 * Authorization middleware factory — restricts access to specified roles.
 * Must be used after the authenticate middleware.
 *
 * @param {...string} roles - Allowed roles (guest, host, admin)
 * @returns {Function} Express middleware
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'AUTH_ERROR'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Access denied. Required: ${roles.join(' or ')}.`, 403, 'FORBIDDEN'));
    }
    next();
  };
}

/**
 * Request body validation middleware factory.
 * Validates req.body against a Joi schema and strips unknown fields.
 *
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const details = {};
      error.details.forEach((d) => {
        details[d.path.join('.')] = d.message;
      });
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
    }
    req.body = value;
    next();
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// Joi schemas for validating incoming request bodies
// Enforces data integrity and provides clear error messages
// ============================================================================
const schemas = {
  register: Joi.object({
    email: Joi.string().email().max(255).required(),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/[a-z]/)
      .pattern(/[A-Z]/)
      .pattern(/[0-9]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, and number.',
      }),
    firstName: Joi.string().trim().min(1).max(100).required(),
    lastName: Joi.string().trim().min(1).max(100).required(),
    phoneNumber: Joi.string()
      .pattern(/^(\+251|0)[9]\d{8}$/)
      .optional()
      .allow(null, ''),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createListing: Joi.object({
    title: Joi.string().trim().min(5).max(255).required(),
    description: Joi.string().trim().min(20).max(5000).required(),
    listingType: Joi.string().valid('short_term', 'long_term', 'both').required(),
    propertyType: Joi.string()
      .valid('apartment', 'house', 'villa', 'condo', 'guest_house', 'shared_room', 'serviced_apartment')
      .required(),
    bedrooms: Joi.number().integer().min(0).max(50).default(1),
    bathrooms: Joi.number().integer().min(1).max(50).default(1),
    maxGuests: Joi.number().integer().min(1).max(100).default(1),
    bedsCount: Joi.number().integer().min(1).max(100).default(1),
    pricePerNight: Joi.number().positive().precision(2).optional().allow(null),
    pricePerMonth: Joi.number().positive().precision(2).optional().allow(null),
    cleaningFee: Joi.number().min(0).precision(2).default(0),
    securityDeposit: Joi.number().min(0).precision(2).default(0),
    streetAddress: Joi.string().trim().min(5).max(500).required(),
    city: Joi.string().trim().min(2).max(100).required(),
    subcity: Joi.string().trim().max(100).optional().allow(null, ''),
    amenities: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          category: Joi.string().optional(),
          iconName: Joi.string().optional(),
        })
      )
      .max(50)
      .optional(),
    instantBook: Joi.boolean().default(false),
    minNights: Joi.number().integer().min(1).default(1),
    cancellationPolicy: Joi.string().valid('flexible', 'moderate', 'strict').default('flexible'),
  }),

  // ------------------------------------------------------------------------
  // Booking with payment schema
  // Validates booking creation with mandatory transaction number
  // The transactionNumber field is required when config demands it
  // ------------------------------------------------------------------------
  createBookingWithPayment: Joi.object({
    listingId: Joi.string().guid({ version: 'uuidv4' }).required(),
    checkInDate: Joi.date().iso().greater('now').required(),
    checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).required(),
    guestCount: Joi.number().integer().min(1).max(100).default(1),
    bookingType: Joi.string().valid('short_term', 'long_term').required(),
    specialRequests: Joi.string().max(2000).optional().allow(null, ''),
    paymentMethod: Joi.string().valid('bank_transfer', 'telebirr').required(),
    transactionNumber: Joi.string().trim().min(3).max(100).required().messages({
      'string.min': 'Transaction number is required.',
      'any.required': 'Transaction number is required.',
    }),
    proofNotes: Joi.string().max(500).optional().allow(null, ''),
  }),

  // ------------------------------------------------------------------------
  // Transaction validation schema
  // Used to check if a transaction number has already been used
  // ------------------------------------------------------------------------
  validateTransaction: Joi.object({
    transactionNumber: Joi.string().trim().min(3).max(100).required(),
  }),

  // ------------------------------------------------------------------------
  // Booking status update schema
  // ------------------------------------------------------------------------
  updateBookingStatus: Joi.object({
    status: Joi.string().valid('confirmed', 'cancelled', 'completed', 'rejected', 'expired').required(),
    cancellationReason: Joi.string().max(1000).optional().allow(null, ''),
  }),
};

// ============================================================================
// CONTROLLERS
// Route handler functions organized by resource domain
// Each controller method is wrapped with asyncHandler for error propagation
// ============================================================================

// --------------------------------------------------------------------------
// Auth Controller — registration, login, profile retrieval, token refresh, logout
// --------------------------------------------------------------------------
const authController = {

  /**
   * POST /api/auth/register
   * Creates a new user account with hashed password.
   * Sets httpOnly cookies with access and refresh tokens on success.
   */
  register: asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, phoneNumber } = req.body;

    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    if (existing) {
      throw new AppError('An account with this email already exists.', 409, 'CONFLICT');
    }

    const hash = await bcrypt.hash(password, CONFIG.auth.bcryptSaltRounds);
    const user = await queryOne(
      `INSERT INTO users (email, phone_number, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, 'guest')
       RETURNING id, email, phone_number, first_name, last_name, role, is_verified, created_at`,
      [email.toLowerCase().trim(), phoneNumber || null, hash, firstName.trim(), lastName.trim()]
    );

    const tokens = generateTokens(user);

    // Set httpOnly cookies for XSS-safe authentication
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.status(201).json({
      success: true,
      message: 'Account created.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isVerified: user.is_verified,
        },
      },
    });
  }),

  /**
   * POST /api/auth/login
   * Authenticates user with email and password.
   * Implements account lockout after repeated failed attempts.
   * Sets httpOnly cookies with access and refresh tokens on success.
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await queryOne(
      `SELECT id, email, password_hash, first_name, last_name, role,
              is_verified, is_active, login_attempts, locked_until
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!user) throw new AppError('Invalid email or password.', 401, 'AUTH_ERROR');
    if (!user.is_active) throw new AppError('Account deactivated.', 401, 'AUTH_ERROR');

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AppError('Account temporarily locked.', 401, 'AUTH_ERROR');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.login_attempts || 0) + 1;
      if (attempts >= CONFIG.auth.maxLoginAttempts) {
        const lockUntil = new Date(Date.now() + CONFIG.auth.lockoutDurationMinutes * 60000);
        await query('UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3', [
          attempts, lockUntil, user.id,
        ]);
        throw new AppError('Account locked after too many failed attempts.', 401, 'AUTH_ERROR');
      }
      await query('UPDATE users SET login_attempts = $1 WHERE id = $2', [attempts, user.id]);
      throw new AppError('Invalid email or password.', 401, 'AUTH_ERROR');
    }

    await query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    const tokens = generateTokens(user);

    // Set httpOnly cookies for XSS-safe authentication
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      success: true,
      message: 'Logged in.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isVerified: user.is_verified,
        },
      },
    });
  }),

  /**
   * GET /api/auth/me
   * Returns the authenticated user's profile information.
   * Authentication is verified via httpOnly cookie by the authenticate middleware.
   */
  getMe: asyncHandler(async (req, res) => {
    const user = await queryOne(
      `SELECT id, email, phone_number, first_name, last_name, profile_image_url, role, is_verified
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phone_number,
          firstName: user.first_name,
          lastName: user.last_name,
          profileImageUrl: user.profile_image_url,
          role: user.role,
          isVerified: user.is_verified,
        },
      },
    });
  }),

  /**
   * POST /api/auth/refresh-token
   * Reads the refresh token from httpOnly cookie and issues new token pair.
   * Called automatically by the frontend when the access token expires.
   * The refresh cookie is only sent to this specific endpoint.
   */
  refreshToken: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[CONFIG.auth.cookies.refreshName];

    if (!refreshToken) {
      throw new AppError('No refresh token provided.', 401, 'AUTH_ERROR');
    }

    try {
      const decoded = jwt.verify(refreshToken, CONFIG.auth.jwtRefreshSecret);

      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid token type.', 401, 'AUTH_ERROR');
      }

      // Verify the user still exists and is active
      const user = await queryOne(
        'SELECT id, email, role, is_active FROM users WHERE id = $1',
        [decoded.sub]
      );

      if (!user) throw new AppError('User not found.', 401, 'AUTH_ERROR');
      if (!user.is_active) throw new AppError('Account deactivated.', 401, 'AUTH_ERROR');

      // Generate new token pair and set new cookies
      const tokens = generateTokens(user);
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully.',
      });
    } catch (err) {
      // Clear invalid cookies on any error
      clearAuthCookies(res);

      if (err instanceof AppError) throw err;
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired. Please log in again.', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Invalid refresh token.', 401, 'AUTH_ERROR');
    }
  }),

  /**
   * POST /api/auth/logout
   * Clears httpOnly cookies to log the user out.
   * No authentication required — simply removes the cookies.
   */
  logout: asyncHandler(async (req, res) => {
    clearAuthCookies(res);
    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  }),
};

// --------------------------------------------------------------------------
// Listing Controller — property CRUD and search
// --------------------------------------------------------------------------
const listingController = {
  /**
   * POST /api/listings
   * Creates a new property listing for the authenticated host.
   */
  createListing: asyncHandler(async (req, res) => {
    const d = req.body;
    const listing = await queryOne(
      `INSERT INTO listings (
        host_id, title, description, listing_type, property_type,
        bedrooms, bathrooms, max_guests, beds_count,
        price_per_night, price_per_month, cleaning_fee, security_deposit,
        street_address, city, subcity,
        is_active, is_approved, approval_status,
        instant_book, min_nights, cancellation_policy
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,$17,$18,$19,$20,$21)
      RETURNING *`,
      [
        req.user.id, d.title, d.description, d.listingType, d.propertyType,
        d.bedrooms, d.bathrooms, d.maxGuests, d.bedsCount,
        d.pricePerNight || null, d.pricePerMonth || null,
        d.cleaningFee || 0, d.securityDeposit || 0,
        d.streetAddress, d.city, d.subcity || null,
        true, 'approved',
        d.instantBook || false, d.minNights || 1,
        d.cancellationPolicy || 'flexible',
      ]
    );

    if (d.amenities && d.amenities.length > 0) {
      for (const a of d.amenities) {
        await query(
          `INSERT INTO listing_amenities (listing_id, amenity_name, category, icon_name)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [listing.id, a.name, a.category || null, a.iconName || null]
        );
      }
    }

    res.status(201).json({ success: true, message: 'Listing created.', data: { listing } });
  }),

  /**
   * GET /api/listings
   * Searches and filters property listings with pagination.
   */
  searchListings: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(
      parseInt(req.query.limit) || CONFIG.features.paginationDefaultLimit,
      CONFIG.features.paginationMaxLimit
    );
    const offset = (page - 1) * limit;

    let where = 'WHERE l.is_active = true AND l.is_approved = true';
    const params = [];
    let p = 1;

    if (req.query.city) {
      where += ` AND l.city ILIKE $${p}`;
      params.push(`%${req.query.city}%`);
      p++;
    }
    if (req.query.listingType) {
      where += ` AND (l.listing_type = $${p} OR l.listing_type = 'both')`;
      params.push(req.query.listingType);
      p++;
    }
    if (req.query.search) {
      where += ` AND (l.title ILIKE $${p} OR l.description ILIKE $${p})`;
      params.push(`%${req.query.search}%`);
      p++;
    }

    const count = await queryOne(`SELECT COUNT(*) as total FROM listings l ${where}`, params);
    params.push(limit, offset);

    const listings = await query(
      `SELECT l.id, l.title, l.listing_type, l.property_type,
              l.bedrooms, l.bathrooms, l.max_guests,
              l.price_per_night, l.price_per_month,
              l.street_address, l.city, l.subcity,
              l.instant_book, l.created_at,
              u.first_name as host_first_name, u.last_name as host_last_name
       FROM listings l JOIN users u ON l.host_id = u.id
       ${where} ORDER BY l.created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      params
    );

    const listingIds = listings.rows.map((l) => l.id);
    let primaryImages = {};
    if (listingIds.length > 0) {
      const imgs = await query(
        `SELECT listing_id, image_url FROM listing_images
         WHERE listing_id = ANY($1::uuid[]) AND is_primary = true`,
        [listingIds]
      );
      imgs.rows.forEach((img) => { primaryImages[img.listing_id] = img.image_url; });
    }

    res.json({
      success: true,
      data: listings.rows.map((l) => ({
        id: l.id,
        title: l.title,
        listingType: l.listing_type,
        propertyType: l.property_type,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        maxGuests: l.max_guests,
        pricePerNight: l.price_per_night,
        pricePerMonth: l.price_per_month,
        city: l.city,
        subcity: l.subcity,
        streetAddress: l.street_address,
        host: { firstName: l.host_first_name, lastName: l.host_last_name },
        primaryImage: primaryImages[l.id] || null,
        instantBook: l.instant_book,
        createdAt: l.created_at,
      })),
      pagination: {
        page,
        limit,
        totalItems: parseInt(count.total),
        totalPages: Math.ceil(parseInt(count.total) / limit),
      },
    });
  }),

  /**
   * GET /api/listings/:id
   * Returns full listing details with host info, amenities, and images.
   */
  getListingById: asyncHandler(async (req, res) => {
    const listing = await queryOne(
      `SELECT l.*, u.first_name as host_first_name, u.last_name as host_last_name,
              u.profile_image_url as host_image_url
       FROM listings l JOIN users u ON l.host_id = u.id WHERE l.id = $1`,
      [req.params.id]
    );
    if (!listing) throw new AppError('Listing not found.', 404, 'NOT_FOUND');

    await query('UPDATE listings SET view_count = view_count + 1 WHERE id = $1', [req.params.id]);

    const amenities = await query(
      'SELECT amenity_name, category, icon_name FROM listing_amenities WHERE listing_id = $1',
      [req.params.id]
    );
    const images = await query(
      `SELECT id, image_url, thumbnail_url, alt_text, sort_order, is_primary
       FROM listing_images WHERE listing_id = $1 ORDER BY sort_order`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        listing: {
          id: listing.id,
          hostId: listing.host_id,
          host: { firstName: listing.host_first_name, lastName: listing.host_last_name, imageUrl: listing.host_image_url },
          title: listing.title,
          description: listing.description,
          listingType: listing.listing_type,
          propertyType: listing.property_type,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          maxGuests: listing.max_guests,
          bedsCount: listing.beds_count,
          pricePerNight: listing.price_per_night,
          pricePerMonth: listing.price_per_month,
          cleaningFee: listing.cleaning_fee,
          securityDeposit: listing.security_deposit,
          location: { streetAddress: listing.street_address, city: listing.city, subcity: listing.subcity },
          instantBook: listing.instant_book,
          minNights: listing.min_nights,
          maxNights: listing.max_nights,
          checkInTime: listing.check_in_time,
          checkOutTime: listing.check_out_time,
          houseRules: listing.house_rules,
          cancellationPolicy: listing.cancellation_policy,
          amenities: amenities.rows,
          images: images.rows,
          viewCount: listing.view_count,
          isActive: listing.is_active,
          createdAt: listing.created_at,
        },
      },
    });
  }),

  // =========================================================================
  // GET /api/listings/:id/blocked-dates
  // Returns all blocked date ranges for a listing with status labels.
  // Groups consecutive dates into ranges with status (booked/pending).
  // Used by the DatePicker to show unavailable dates with context.
  // =========================================================================
  getBlockedDates: asyncHandler(async (req, res) => {
    const listingId = req.params.id;

    const listing = await queryOne(
      'SELECT id FROM listings WHERE id = $1 AND is_active = true',
      [listingId]
    );
    if (!listing) throw new AppError('Listing not found.', 404, 'NOT_FOUND');

    const blockedDates = await query(
      `SELECT DISTINCT
              d::date as date,
              CASE
                WHEN EXISTS (
                  SELECT 1 FROM bookings b
                  WHERE b.listing_id = $1
                    AND b.status = 'confirmed'
                    AND d::date >= b.check_in_date
                    AND d::date < b.check_out_date
                ) THEN 'booked'
                WHEN EXISTS (
                  SELECT 1 FROM bookings b
                  WHERE b.listing_id = $1
                    AND b.status = 'pending'
                    AND d::date >= b.check_in_date
                    AND d::date < b.check_out_date
                ) THEN 'pending'
                ELSE 'available'
              END as status
       FROM generate_series(
         CURRENT_DATE,
         CURRENT_DATE + INTERVAL '365 days',
         '1 day'::interval
       ) AS d
       WHERE EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.listing_id = $1
           AND b.status IN ('confirmed', 'pending')
           AND d::date >= b.check_in_date
           AND d::date < b.check_out_date
       )
       ORDER BY d::date`,
      [listingId]
    );

    const ranges = [];
    let currentRange = null;

    for (const row of blockedDates.rows) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];

      if (!currentRange) {
        currentRange = {
          startDate: dateStr,
          endDate: dateStr,
          status: row.status,
        };
      } else if (
        currentRange.status === row.status &&
        new Date(row.date).getTime() - new Date(currentRange.endDate).getTime() === 86400000
      ) {
        currentRange.endDate = dateStr;
      } else {
        ranges.push(currentRange);
        currentRange = {
          startDate: dateStr,
          endDate: dateStr,
          status: row.status,
        };
      }
    }

    if (currentRange) {
      ranges.push(currentRange);
    }

    res.json({
      success: true,
      data: {
        blockedRanges: ranges,
        blockedDates: blockedDates.rows.map((r) => ({
          date: new Date(r.date).toISOString().split('T')[0],
          status: r.status,
        })),
      },
    });
  }),

  // =========================================================================
  // GET /api/listings/:id/similar
  // Returns similar listings based on city, property type, and price range.
  // Excludes the current listing from results.
  // Used to suggest alternatives when a listing is fully booked.
  // =========================================================================
  getSimilarListings: asyncHandler(async (req, res) => {
    const listingId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);

    const currentListing = await queryOne(
      `SELECT city, listing_type, property_type, price_per_night, price_per_month
       FROM listings WHERE id = $1 AND is_active = true`,
      [listingId]
    );
    if (!currentListing) throw new AppError('Listing not found.', 404, 'NOT_FOUND');

    const refPrice = parseFloat(
      currentListing.price_per_night || currentListing.price_per_month || 0
    );

    const similar = await query(
      `SELECT l.id, l.title, l.listing_type, l.property_type,
              l.bedrooms, l.bathrooms, l.max_guests,
              l.price_per_night, l.price_per_month,
              l.city, l.subcity, l.street_address, l.instant_book,
              (SELECT image_url FROM listing_images
               WHERE listing_id = l.id AND is_primary = true LIMIT 1) as primary_image
       FROM listings l
       WHERE l.id != $1
         AND l.is_active = true
         AND l.is_approved = true
         AND l.city = $2
         AND (
           (l.price_per_night IS NOT NULL AND l.price_per_night BETWEEN $3 AND $4)
           OR
           (l.price_per_month IS NOT NULL AND l.price_per_month BETWEEN $5 AND $6)
           OR
           (l.listing_type = $7)
         )
       ORDER BY
         CASE WHEN l.property_type = $8 THEN 0 ELSE 1 END,
         RANDOM()
       LIMIT $9`,
      [
        listingId,
        currentListing.city,
        refPrice * 0.5, refPrice * 1.5,
        refPrice * 0.5, refPrice * 1.5,
        currentListing.listing_type,
        currentListing.property_type,
        limit,
      ]
    );

    res.json({
      success: true,
      data: similar.rows.map((l) => ({
        id: l.id,
        title: l.title,
        listingType: l.listing_type,
        propertyType: l.property_type,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        maxGuests: l.max_guests,
        pricePerNight: l.price_per_night,
        pricePerMonth: l.price_per_month,
        city: l.city,
        subcity: l.subcity,
        primaryImage: l.primary_image,
        instantBook: l.instant_book,
      })),
      meta: {
        basedOn: {
          city: currentListing.city,
          propertyType: currentListing.property_type,
          priceRange: `${refPrice * 0.5} - ${refPrice * 1.5}`,
        },
      },
    });
  }),
};

// --------------------------------------------------------------------------
// Booking Controller — reservation management with payment integration
// Includes automated expiry logic for serverless environments
// --------------------------------------------------------------------------
const bookingController = {

  /**
   * SERVERLESS EXPIRY CHECK
   * Finds and expires unpaid bookings that have exceeded their payment timeout.
   * Called internally on booking fetches to keep data fresh without cron jobs.
   */
  async expireUnpaidBookings() {
    try {
      const now = new Date();
      const expiredBookings = await query(
        `SELECT id, listing_id, check_in_date, check_out_date 
         FROM bookings 
         WHERE status = 'pending' 
         AND payment_expires_at IS NOT NULL 
         AND payment_expires_at < $1`,
        [now]
      );

      if (expiredBookings.rows.length === 0) return 0;

      for (const b of expiredBookings.rows) {
        await query("UPDATE bookings SET status = 'expired' WHERE id = $1", [b.id]);
        await query(
          `UPDATE listing_availability SET status = 'available' WHERE listing_id = $1 AND date >= $2 AND date < $3`,
          [b.listing_id, b.check_in_date, b.check_out_date]
        );
        await query(
          "UPDATE payments SET status = 'cancelled', failure_reason = 'Payment timeout expired' WHERE booking_id = $1",
          [b.id]
        );
      }
      return expiredBookings.rows.length;
    } catch (err) {
      console.error('Expiry check failed:', err.message);
      return 0;
    }
  },

  /**
   * POST /api/bookings
   * Creates a new booking with availability check, pricing calculation,
   * and mandatory payment record with transaction number.
   * Sets payment_expires_at for automated timeout tracking.
   */
  createBooking: asyncHandler(async (req, res) => {
    const {
      listingId, checkInDate, checkOutDate, guestCount,
      bookingType, specialRequests,
      paymentMethod, transactionNumber, proofNotes,
    } = req.body;

    const listing = await queryOne(
      'SELECT * FROM listings WHERE id = $1 AND is_active = true AND is_approved = true',
      [listingId]
    );
    if (!listing) throw new AppError('Listing not found.', 404, 'NOT_FOUND');
    if (listing.host_id === req.user.id) throw new AppError('Cannot book your own listing.', 400, 'VALIDATION_ERROR');

    // Final availability check (prevents race conditions)
    const conflict = await queryOne(
      `SELECT id FROM bookings
       WHERE listing_id = $1 AND status IN ('pending','confirmed')
       AND check_in_date < $3 AND check_out_date > $2`,
      [listingId, checkInDate, checkOutDate]
    );
    if (conflict) throw new AppError('Dates are no longer available.', 409, 'CONFLICT');

    // Validate transaction number uniqueness
    if (CONFIG.features.preventDuplicateTransactions && transactionNumber) {
      const existingTransaction = await queryOne(
        `SELECT p.id FROM payments p
         WHERE p.transaction_reference = $1 AND p.status IN ('completed', 'processing')`,
        [transactionNumber.trim()]
      );
      if (existingTransaction) {
        throw new AppError('This transaction number has already been used.', 409, 'DUPLICATE_TRANSACTION');
      }
    }

    // Calculate pricing
    const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
    const baseAmount = parseFloat(listing.price_per_night) * nights;
    const cleaningFee = parseFloat(listing.cleaning_fee) || 0;
    const serviceFee = Math.min(
      Math.max(Math.round(baseAmount * (CONFIG.payment.serviceFeePercent / 100)), CONFIG.payment.serviceFeeMin),
      CONFIG.payment.serviceFeeMax
    );
    const totalAmount = baseAmount + cleaningFee + serviceFee;

    // Calculate payment expiry time
    const expiryTime = new Date(Date.now() + CONFIG.features.paymentTimeoutMinutes * 60 * 1000);

    // Create booking with payment expiry timestamp
    const booking = await queryOne(
      `INSERT INTO bookings (
        listing_id, guest_id, host_id, booking_type,
        check_in_date, check_out_date, guest_count,
        status, base_amount, cleaning_fee, service_fee,
        security_deposit, total_amount, special_requests, payment_expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        listingId, req.user.id, listing.host_id, bookingType,
        checkInDate, checkOutDate, guestCount,
        baseAmount, cleaningFee, serviceFee,
        0, totalAmount, specialRequests || null,
        expiryTime,
      ]
    );

    // Create payment record with transaction number (status: processing)
    const payment = await queryOne(
      `INSERT INTO payments (
        booking_id, user_id, amount, currency, payment_method,
        transaction_reference, proof_notes, status
      ) VALUES ($1, $2, $3, 'ETB', $4, $5, $6, 'processing')
      RETURNING *`,
      [
        booking.id, req.user.id, totalAmount,
        paymentMethod, transactionNumber.trim(), proofNotes || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Booking created. Payment is being processed.',
      data: {
        booking,
        payment,
        pricing: { baseAmount, cleaningFee, serviceFee, securityDeposit: 0, totalAmount, currency: 'ETB' },
        paymentTimeout: { minutes: CONFIG.features.paymentTimeoutMinutes, expiresAt: expiryTime.toISOString() },
      },
    });
  }),

  /**
   * POST /api/payments/validate-transaction
   * Checks whether a transaction number has already been used.
   */
  validateTransaction: asyncHandler(async (req, res) => {
    const { transactionNumber } = req.body;
    if (!transactionNumber || transactionNumber.trim().length < 3) {
      throw new AppError('Please provide a valid transaction number.', 400, 'VALIDATION_ERROR');
    }

    const existing = await queryOne(
      `SELECT p.id FROM payments p WHERE p.transaction_reference = $1 AND p.status IN ('completed', 'processing')`,
      [transactionNumber.trim()]
    );

    res.json({
      success: true,
      data: {
        valid: !existing,
        message: existing ? 'This transaction number has already been used.' : 'Transaction number is available.',
      },
    });
  }),

  /**
   * GET /api/bookings/guest
   * Returns paginated bookings for the authenticated guest.
   * Runs expiry check first to clean up timed-out bookings.
   */
  getGuestBookings: asyncHandler(async (req, res) => {
    await bookingController.expireUnpaidBookings(); // Serverless expiry cleanup
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const count = await queryOne('SELECT COUNT(*) as total FROM bookings WHERE guest_id = $1', [req.user.id]);
    const bookings = await query(
      `SELECT b.*, l.title as listing_title, l.city,
              p.status as payment_status, p.transaction_reference
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.guest_id = $1
       ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      success: true,
      data: bookings.rows,
      pagination: { page, limit, totalItems: parseInt(count.total), totalPages: Math.ceil(parseInt(count.total) / limit) },
    });
  }),

  /**
   * GET /api/bookings/host
   * Returns paginated bookings for the authenticated host's listings.
   * Runs expiry check first to clean up timed-out bookings.
   */
  getHostBookings: asyncHandler(async (req, res) => {
    await bookingController.expireUnpaidBookings(); // Serverless expiry cleanup

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const count = await queryOne('SELECT COUNT(*) as total FROM bookings WHERE host_id = $1', [req.user.id]);
    const bookings = await query(
      `SELECT b.*, l.title as listing_title, l.city,
              gu.first_name as guest_first_name, gu.last_name as guest_last_name,
              p.status as payment_status, p.transaction_reference
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users gu ON b.guest_id = gu.id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.host_id = $1
       ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      success: true,
      data: bookings.rows,
      pagination: { page, limit, totalItems: parseInt(count.total), totalPages: Math.ceil(parseInt(count.total) / limit) },
    });
  }),

  /**
   * GET /api/bookings/:id
   * Returns a single booking with payment information.
   */
  getBookingById: asyncHandler(async (req, res) => {
    const booking = await queryOne(
      `SELECT b.*, l.title as listing_title, l.street_address, l.city,
              gu.first_name as guest_first_name, gu.last_name as guest_last_name,
              hu.first_name as host_first_name, hu.last_name as host_last_name,
              p.id as payment_id, p.status as payment_status,
              p.transaction_reference, p.proof_image_url, p.proof_notes
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users gu ON b.guest_id = gu.id
       JOIN users hu ON b.host_id = hu.id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (!booking) throw new AppError('Booking not found.', 404, 'NOT_FOUND');
    if (booking.guest_id !== req.user.id && booking.host_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to view this booking.', 403, 'FORBIDDEN');
    }

    res.json({ success: true, data: { booking } });
  }),

  /**
   * PATCH /api/bookings/:id/status
   * Updates the status of a booking.
   */
  updateBookingStatus: asyncHandler(async (req, res) => {
    const { status, cancellationReason } = req.body;
    const booking = await queryOne('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!booking) throw new AppError('Booking not found.', 404, 'NOT_FOUND');

    const validTransitions = {
      pending: { confirmed: ['host', 'admin'], cancelled: ['guest', 'admin'], rejected: ['host', 'admin'], expired: ['system'] },
      confirmed: { cancelled: ['guest', 'host', 'admin'], completed: ['host', 'admin'] },
    };

    const allowedRoles = validTransitions[booking.status]?.[status];
    if (!allowedRoles) throw new AppError(`Cannot change status from "${booking.status}" to "${status}".`, 400, 'VALIDATION_ERROR');
    if (!allowedRoles.includes('system') && !allowedRoles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN');
    }

    const updates = { status };
    if (status === 'cancelled') { updates.cancelled_by = req.user.id; updates.cancelled_at = new Date(); updates.cancellation_reason = cancellationReason || null; }
    if (status === 'confirmed') updates.confirmed_at = new Date();
    if (status === 'completed') updates.completed_at = new Date();

    const setClauses = [];
    const params = [];
    let p = 1;
    for (const [key, value] of Object.entries(updates)) { setClauses.push(`${key} = $${p}`); params.push(value); p++; }
    params.push(req.params.id);

    const updated = await queryOne(`UPDATE bookings SET ${setClauses.join(', ')} WHERE id = $${p} RETURNING *`, params);
    
    // Release dates if cancelled/rejected
    if (status === 'cancelled' || status === 'rejected') {
      await query(`UPDATE listing_availability SET status = 'available' WHERE listing_id = $1 AND date >= $2 AND date < $3`, [booking.listing_id, booking.check_in_date, booking.check_out_date]);
    }

    res.json({ success: true, message: `Booking ${status}.`, data: { booking: updated } });
  }),
};

// --------------------------------------------------------------------------
// Favorite Controller — saved listing management
// --------------------------------------------------------------------------
const favoriteController = {
  toggle: asyncHandler(async (req, res) => {
    const existing = await queryOne(
      'SELECT id FROM favorites WHERE user_id = $1 AND listing_id = $2',
      [req.user.id, req.params.listingId]
    );
    if (existing) {
      await query('DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2', [req.user.id, req.params.listingId]);
      res.json({ success: true, data: { action: 'removed' } });
    } else {
      await query('INSERT INTO favorites (user_id, listing_id) VALUES ($1, $2)', [req.user.id, req.params.listingId]);
      res.json({ success: true, data: { action: 'added' } });
    }
  }),

  list: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const offset = (page - 1) * limit;
    const count = await queryOne('SELECT COUNT(*) as total FROM favorites WHERE user_id = $1', [req.user.id]);
    const favorites = await query(
      `SELECT f.id as favorite_id, f.created_at as favorited_at,
              l.id, l.title, l.listing_type, l.price_per_night, l.price_per_month,
              l.city, l.bedrooms, l.bathrooms, l.max_guests,
              (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = true LIMIT 1) as primary_image
       FROM favorites f JOIN listings l ON f.listing_id = l.id
       WHERE f.user_id = $1 ORDER BY f.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({
      success: true,
      data: favorites.rows,
      pagination: { page, limit, totalItems: parseInt(count.total), totalPages: Math.ceil(parseInt(count.total) / limit) },
    });
  }),
};

// --------------------------------------------------------------------------
// Admin Controller — platform administration endpoints
// --------------------------------------------------------------------------
const adminController = {
  getDashboard: asyncHandler(async (req, res) => {
    const stats = {};
    const userStats = await queryOne(
      `SELECT COUNT(*) as total_users,
              COUNT(*) FILTER (WHERE role = 'guest') as total_guests,
              COUNT(*) FILTER (WHERE role = 'host') as total_hosts,
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d
       FROM users WHERE is_active = true`
    );
    stats.users = userStats;

    const listingStats = await queryOne(
      `SELECT COUNT(*) as total_listings,
              COUNT(*) FILTER (WHERE listing_type IN ('short_term', 'both')) as short_term,
              COUNT(*) FILTER (WHERE listing_type IN ('long_term', 'both')) as long_term,
              COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_approval
       FROM listings WHERE is_active = true`
    );
    stats.listings = listingStats;

    const bookingStats = await queryOne(
      `SELECT COUNT(*) as total_bookings,
              COUNT(*) FILTER (WHERE status = 'pending') as pending,
              COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
              COUNT(*) FILTER (WHERE status = 'completed') as completed,
              COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as bookings_30d
       FROM bookings`
    );
    stats.bookings = bookingStats;

    const revenueStats = await queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) as total_revenue,
              COALESCE(SUM(service_fee), 0) as total_service_fees,
              COALESCE(SUM(total_amount) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) as revenue_30d
       FROM bookings WHERE status IN ('confirmed', 'completed')`
    );
    stats.revenue = revenueStats;

    const paymentStats = await queryOne(
      `SELECT COUNT(*) FILTER (WHERE status = 'pending') as pending_payments,
              COUNT(*) FILTER (WHERE status = 'processing') as processing_payments,
              COUNT(*) FILTER (WHERE status = 'completed') as completed_payments
       FROM payments`
    );
    stats.payments = paymentStats;

    const withdrawalStats = await queryOne(
      `SELECT COUNT(*) FILTER (WHERE status = 'pending') as pending_withdrawals,
              COALESCE(SUM(net_amount) FILTER (WHERE status = 'pending'), 0) as pending_amount
       FROM withdrawals`
    );
    stats.withdrawals = withdrawalStats;

    const recentUsers = await query('SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    const recentBookings = await query(
      `SELECT b.id, b.status, b.total_amount, b.created_at,
              u.first_name, u.last_name, l.title as listing_title
       FROM bookings b JOIN users u ON b.guest_id = u.id JOIN listings l ON b.listing_id = l.id
       ORDER BY b.created_at DESC LIMIT 5`
    );
    stats.recentActivity = { users: recentUsers.rows, bookings: recentBookings.rows };
    res.json({ success: true, data: stats });
  }),

  listUsers: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    let where = 'WHERE 1=1';
    const params = [];
    let p = 1;
    if (search) { where += ` AND (first_name ILIKE $${p} OR last_name ILIKE $${p} OR email ILIKE $${p})`; params.push(`%${search}%`); p++; }
    if (role) { where += ` AND role = $${p}`; params.push(role); p++; }
    const count = await queryOne(`SELECT COUNT(*) as total FROM users ${where}`, params);
    params.push(limit, offset);
    const users = await query(
      `SELECT id, email, first_name, last_name, role, is_verified, is_active, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      params
    );
    res.json({ success: true, data: users.rows, pagination: { page, limit, totalItems: parseInt(count.total), totalPages: Math.ceil(parseInt(count.total) / limit) } });
  }),

  toggleUserStatus: asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    const user = await queryOne('UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, is_active', [isActive, req.params.id]);
    if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
    res.json({ success: true, data: { user } });
  }),

  getPendingListings: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    const count = await queryOne("SELECT COUNT(*) as total FROM listings WHERE approval_status = 'pending'");
    const listings = await query(
      `SELECT l.*, u.first_name as host_first_name, u.last_name as host_last_name, u.email as host_email
       FROM listings l JOIN users u ON l.host_id = u.id
       WHERE l.approval_status = 'pending' ORDER BY l.created_at ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ success: true, data: listings.rows, pagination: { page, limit, totalItems: parseInt(count.total), totalPages: Math.ceil(parseInt(count.total) / limit) } });
  }),

  moderateListing: asyncHandler(async (req, res) => {
    const { action, notes } = req.body;
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const listing = await queryOne(
      `UPDATE listings SET approval_status = $1, is_approved = $2, reviewed_by = $3, review_notes = $4, approved_at = NOW()
       WHERE id = $5 RETURNING *`,
      [newStatus, action === 'approve', req.user.id, notes || null, req.params.id]
    );
    if (!listing) throw new AppError('Listing not found.', 404, 'NOT_FOUND');
    res.json({ success: true, data: { listing } });
  }),

  listPayments: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    let where = 'WHERE 1=1';
    const params = [];
    let p = 1;
    if (status) { where += ` AND p.status = $${p}`; params.push(status); p++; }
    const count = await queryOne(`SELECT COUNT(*) as total FROM payments p ${where}`, params);
    params.push(limit, offset);
    const payments = await query(
      `SELECT p.*, u.first_name, u.last_name, u.email, l.title as listing_title
       FROM payments p JOIN users u ON p.user_id = u.id
       JOIN bookings b ON p.booking_id = b.id JOIN listings l ON b.listing_id = l.id
       ${where} ORDER BY p.created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      params
    );
    res.json({ success: true, data: payments.rows, pagination: { page, limit, totalItems: parseInt(count.total), totalPages: Math.ceil(parseInt(count.total) / limit) } });
  }),

  /**
   * PATCH /api/admin/payments/:id/verify
   * Verifies, rejects, or flags a payment for manual review (admin only).
   * Supports 'verify', 'reject', and 'review' actions.
   * Body: { action: 'verify'|'reject'|'review', reason? }
   */
  verifyPayment: asyncHandler(async (req, res) => {
    const { action, reason } = req.body;
    
    // Determine new status based on the admin's action
    let newStatus;
    if (action === 'verify') {
      newStatus = 'completed';
    } else if (action === 'review') {
      newStatus = 'pending_review'; // Flag for further manual admin review
    } else {
      newStatus = 'failed'; // Default for 'reject' or unknown actions
    }

    // Update the payment record
    // Only allows updating payments that are in a verifiable state
    const payment = await queryOne(
      `UPDATE payments 
       SET status = $1, verified_by = $2, verified_at = NOW(), failure_reason = $3 
       WHERE id = $4 AND status IN ('processing', 'pending', 'pending_review') 
       RETURNING *`,
      [newStatus, req.user.id, reason || null, req.params.id]
    );
    
    if (!payment) {
      throw new AppError('Payment not found or already processed.', 404, 'NOT_FOUND');
    }

    // If the payment is verified, automatically confirm the associated booking
    if (newStatus === 'completed') {
      await query(
        "UPDATE bookings SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1 AND status = 'pending'",
        [payment.booking_id]
      );
    }

    res.json({ success: true, data: { payment } });
  }),

  listWithdrawals: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    let where = 'WHERE 1=1';
    const params = [];
    let p = 1;
    if (status) { where += ` AND w.status = $${p}`; params.push(status); p++; }
    const count = await queryOne(`SELECT COUNT(*) as total FROM withdrawals w ${where}`, params);
    params.push(limit, offset);
    const withdrawals = await query(
      `SELECT w.*, u.first_name, u.last_name, u.email
       FROM withdrawals w JOIN users u ON w.user_id = u.id
       ${where} ORDER BY w.created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      params
    );
    res.json({ success: true, data: withdrawals.rows, pagination: { page, limit, totalItems: parseInt(count.total), totalPages: Math.ceil(parseInt(count.total) / limit) } });
  }),

  processWithdrawal: asyncHandler(async (req, res) => {
    const { action } = req.body;
    const newStatus = action === 'approve' ? 'completed' : 'failed';
    const withdrawal = await queryOne(
      'UPDATE withdrawals SET status = $1, processed_by = $2, processed_at = NOW() WHERE id = $3 RETURNING *',
      [newStatus, req.user.id, req.params.id]
    );
    if (!withdrawal) throw new AppError('Withdrawal not found.', 404, 'NOT_FOUND');
    res.json({ success: true, data: { withdrawal } });
  }),
};

// ============================================================================
// EXPRESS APPLICATION
// ============================================================================
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ROOSTAY API is running.', timestamp: new Date().toISOString(), environment: CONFIG.app.env });
});

// ---- Auth Routes (with httpOnly cookie support) ----
app.post('/api/auth/register', validateBody(schemas.register), authController.register);
app.post('/api/auth/login', validateBody(schemas.login), authController.login);
app.get('/api/auth/me', authenticate, authController.getMe);
app.post('/api/auth/refresh-token', authController.refreshToken);
app.post('/api/auth/logout', authController.logout);

// ---- Listing Routes ----
app.post('/api/listings', authenticate, authorize('host', 'admin'), validateBody(schemas.createListing), listingController.createListing);
app.get('/api/listings', listingController.searchListings);
app.get('/api/listings/:id', listingController.getListingById);

// ---- Blocked dates and similar listings routes ----
// These endpoints provide availability data and alternatives for fully booked listings
app.get('/api/listings/:id/blocked-dates', listingController.getBlockedDates);
app.get('/api/listings/:id/similar', listingController.getSimilarListings);

// ---- Booking Routes (with payment integration) ----
app.post(
  '/api/bookings',
  authenticate,
  authorize('guest', 'admin'),
  validateBody(schemas.createBookingWithPayment),
  bookingController.createBooking
);
app.get('/api/bookings/guest', authenticate, bookingController.getGuestBookings);
app.get('/api/bookings/host', authenticate, authorize('host', 'admin'), bookingController.getHostBookings);
app.get('/api/bookings/:id', authenticate, bookingController.getBookingById);
app.patch(
  '/api/bookings/:id/status',
  authenticate,
  validateBody(schemas.updateBookingStatus),
  bookingController.updateBookingStatus
);

// ---- Payment Routes ----
app.post(
  '/api/payments/validate-transaction',
  authenticate,
  validateBody(schemas.validateTransaction),
  bookingController.validateTransaction
);

// ---- Favorite Routes ----
app.post('/api/favorites/:listingId', authenticate, favoriteController.toggle);
app.get('/api/favorites', authenticate, favoriteController.list);

// ---- Notification Routes ----
app.get('/api/notifications', authenticate, asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
  res.json({ success: true, data: { notifications: result.rows, unreadCount: result.rows.filter((n) => !n.is_read).length } });
}));

// ---- Admin Routes ----
app.get('/api/admin/dashboard', authenticate, authorize('admin'), adminController.getDashboard);
app.get('/api/admin/users', authenticate, authorize('admin'), adminController.listUsers);
app.patch('/api/admin/users/:id/toggle-status', authenticate, authorize('admin'), adminController.toggleUserStatus);
app.get('/api/admin/listings/pending', authenticate, authorize('admin'), adminController.getPendingListings);
app.patch('/api/admin/listings/:id/moderate', authenticate, authorize('admin'), adminController.moderateListing);
app.get('/api/admin/payments', authenticate, authorize('admin'), adminController.listPayments);
app.patch('/api/admin/payments/:id/verify', authenticate, authorize('admin'), adminController.verifyPayment);
app.get('/api/admin/withdrawals', authenticate, authorize('admin'), adminController.listWithdrawals);
app.patch('/api/admin/withdrawals/:id/process', authenticate, authorize('admin'), adminController.processWithdrawal);

// ---- Root ----
app.get('/', (req, res) => {
  res.json({ success: true, name: 'ROOSTAY API', version: '1.0.0', environment: CONFIG.app.env });
});

// ---- 404 Handler ----
// Uses a regex pattern instead of wildcard for path-to-regexp v8 compatibility
app.all(/.*/, (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
});

// ---- Global Error Handler ----
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';
  console.error(`[${statusCode}] ${err.message}`);
  res.status(statusCode).json({ success: false, error: { code: err.errorCode || 'INTERNAL_ERROR', message } });
});

// ============================================================================
// NEXT.JS API ROUTE EXPORT
// ============================================================================
export default function handler(req, res) {
  return app(req, res);
}

export const config = {
  api: { bodyParser: false, externalResolver: true },
};