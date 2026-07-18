// frontend/pages/api/[...path].js
// Complete ROOSTAY API handler for Vercel serverless deployment
// Handles all API routes: auth, listings, bookings, payments, admin, etc.
// Uses httpOnly cookies for XSS-safe authentication
// Uses native PostgreSQL driver with parameterized queries
// Integrates Cloudinary for secure image uploads
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
const cloudinary = require('cloudinary').v2;

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
  upload: {
    maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    rootFolder: 'roostay',
  },
};

// ============================================================================
// CLOUDINARY CONFIGURATION
// Configures Cloudinary SDK using environment variables
// Used for secure image uploads (listings, verifications, payment proofs)
// ============================================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    images: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          sortOrder: Joi.number().integer().min(0).default(0),
          isPrimary: Joi.boolean().default(false),
        })
      )
      .max(15)
      .optional()
      .default([]),
  }),

  // ------------------------------------------------------------------------
  // Update listing schema
  // All fields optional — only provided fields will be updated
  // ------------------------------------------------------------------------
  updateListing: Joi.object({
    title: Joi.string().trim().min(5).max(255).optional(),
    description: Joi.string().trim().min(20).max(5000).optional(),
    listingType: Joi.string().valid('short_term', 'long_term', 'both').optional(),
    propertyType: Joi.string()
      .valid('apartment', 'house', 'villa', 'condo', 'guest_house', 'shared_room', 'serviced_apartment')
      .optional(),
    bedrooms: Joi.number().integer().min(0).max(50).optional(),
    bathrooms: Joi.number().integer().min(1).max(50).optional(),
    maxGuests: Joi.number().integer().min(1).max(100).optional(),
    bedsCount: Joi.number().integer().min(1).max(100).optional(),
    pricePerNight: Joi.number().positive().precision(2).optional().allow(null),
    pricePerMonth: Joi.number().positive().precision(2).optional().allow(null),
    cleaningFee: Joi.number().min(0).precision(2).optional(),
    securityDeposit: Joi.number().min(0).precision(2).optional(),
    streetAddress: Joi.string().trim().min(5).max(500).optional(),
    city: Joi.string().trim().min(2).max(100).optional(),
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
    instantBook: Joi.boolean().optional(),
    minNights: Joi.number().integer().min(1).optional(),
    cancellationPolicy: Joi.string().valid('flexible', 'moderate', 'strict').optional(),
    houseRules: Joi.string().trim().max(2000).optional().allow(null, ''),
  }),

  // ------------------------------------------------------------------------
  // Booking with payment schema
  // Validates booking creation with mandatory transaction number
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

  // ------------------------------------------------------------------------
  // Host application schema
  // ------------------------------------------------------------------------
  hostApplication: Joi.object({
    idType: Joi.string().valid('kebele_id', 'passport', 'drivers_license', 'national_id').required(),
    idNumber: Joi.string().trim().min(3).max(100).required(),
    idFrontImageUrl: Joi.string().uri().required(),
    idBackImageUrl: Joi.string().uri().optional().allow(null, ''),
    hostingExperience: Joi.string().valid('yes', 'no').required(),
    propertyCount: Joi.string().valid('1-2', '3-5', '5+').required(),
    motivation: Joi.string().trim().max(2000).optional().allow(null, ''),
  }),

  // ------------------------------------------------------------------------
  // Image upload schema
  // ------------------------------------------------------------------------
  uploadImage: Joi.object({
    image: Joi.string()
      .pattern(/^data:image\/(jpeg|jpg|png|webp|avif);base64,/)
      .required()
      .messages({
        'string.pattern.base': 'Image must be a valid base64 data URL (JPEG, PNG, WebP, or AVIF).',
        'any.required': 'Image data is required.',
      }),
    folder: Joi.string()
      .trim()
      .valid('listings', 'verifications', 'payment_proofs', 'profiles', 'general')
      .default('general')
      .messages({
        'any.only': 'Folder must be one of: listings, verifications, payment_proofs, profiles, general.',
      }),
  }),

  // ------------------------------------------------------------------------
  // Review schemas
  // ------------------------------------------------------------------------
  createReview: Joi.object({
    bookingId: Joi.string().guid({ version: 'uuidv4' }).required(),
    cleanliness: Joi.number().integer().min(1).max(5).required(),
    accuracy: Joi.number().integer().min(1).max(5).required(),
    communication: Joi.number().integer().min(1).max(5).required(),
    location: Joi.number().integer().min(1).max(5).required(),
    value: Joi.number().integer().min(1).max(5).required(),
    reviewText: Joi.string().max(3000).optional().allow(null, ''),
  }),

  addHostResponse: Joi.object({
    responseText: Joi.string().min(1).max(2000).required(),
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

      const user = await queryOne(
        'SELECT id, email, role, is_active FROM users WHERE id = $1',
        [decoded.sub]
      );

      if (!user) throw new AppError('User not found.', 401, 'AUTH_ERROR');
      if (!user.is_active) throw new AppError('Account deactivated.', 401, 'AUTH_ERROR');

      const tokens = generateTokens(user);
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully.',
      });
    } catch (err) {
      clearAuthCookies(res);

      if (err instanceof AppError) throw err;
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired. Please log in again.', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Invalid refresh token.', 401, 'AUTH_ERROR');
    }
  }),

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

    if (d.images && d.images.length > 0) {
      for (let i = 0; i < d.images.length; i++) {
        const img = d.images[i];
        await query(
          `INSERT INTO listing_images (listing_id, image_url, sort_order, is_primary)
           VALUES ($1, $2, $3, $4)`,
          [
            listing.id,
            img.url,
            img.sortOrder || i,
            img.isPrimary || i === 0,
          ]
        );
      }
    }

    const images = await query(
      `SELECT id, image_url, sort_order, is_primary 
       FROM listing_images 
       WHERE listing_id = $1 
       ORDER BY sort_order`,
      [listing.id]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Listing created successfully.', 
      data: { 
        listing,
        images: images.rows 
      } 
    });
  }),

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

  getHostListings: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(
      parseInt(req.query.limit) || CONFIG.features.paginationDefaultLimit,
      CONFIG.features.paginationMaxLimit
    );
    const offset = (page - 1) * limit;

    const count = await queryOne(
      'SELECT COUNT(*) as total FROM listings WHERE host_id = $1',
      [req.user.id]
    );
    
    const listings = await query(
      `SELECT l.id, l.title, l.listing_type, l.property_type,
              l.bedrooms, l.bathrooms, l.max_guests,
              l.price_per_night, l.price_per_month,
              l.street_address, l.city, l.subcity,
              l.is_active, l.is_approved, l.approval_status,
              l.created_at,
              (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = true LIMIT 1) as primary_image
       FROM listings l
       WHERE l.host_id = $1
       ORDER BY l.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      success: true,
      data: listings.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(count.total),
        totalPages: Math.ceil(parseInt(count.total) / limit),
      },
    });
  }),

  updateListing: asyncHandler(async (req, res) => {
    const d = req.body;
    
    const existing = await queryOne(
      'SELECT id, host_id FROM listings WHERE id = $1',
      [req.params.id]
    );
    if (!existing) throw new AppError('Listing not found.', 404, 'NOT_FOUND');
    if (existing.host_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to update this listing.', 403, 'FORBIDDEN');
    }

    const updated = await queryOne(
      `UPDATE listings SET
        title = COALESCE($1, title), description = COALESCE($2, description),
        listing_type = COALESCE($3, listing_type), property_type = COALESCE($4, property_type),
        bedrooms = COALESCE($5, bedrooms), bathrooms = COALESCE($6, bathrooms),
        max_guests = COALESCE($7, max_guests), beds_count = COALESCE($8, beds_count),
        price_per_night = COALESCE($9, price_per_night), price_per_month = COALESCE($10, price_per_month),
        cleaning_fee = COALESCE($11, cleaning_fee), security_deposit = COALESCE($12, security_deposit),
        street_address = COALESCE($13, street_address), city = COALESCE($14, city),
        subcity = COALESCE($15, subcity), instant_book = COALESCE($16, instant_book),
        min_nights = COALESCE($17, min_nights), cancellation_policy = COALESCE($18, cancellation_policy),
        house_rules = COALESCE($19, house_rules)
       WHERE id = $20 RETURNING *`,
      [
        d.title, d.description, d.listingType, d.propertyType,
        d.bedrooms, d.bathrooms, d.maxGuests, d.bedsCount,
        d.pricePerNight, d.pricePerMonth,
        d.cleaningFee, d.securityDeposit,
        d.streetAddress, d.city, d.subcity,
        d.instantBook, d.minNights,
        d.cancellationPolicy, d.houseRules,
        req.params.id,
      ]
    );

    if (d.amenities !== undefined) {
      await query('DELETE FROM listing_amenities WHERE listing_id = $1', [req.params.id]);
      if (d.amenities && d.amenities.length > 0) {
        for (const a of d.amenities) {
          await query(
            `INSERT INTO listing_amenities (listing_id, amenity_name, category, icon_name)
             VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
            [req.params.id, a.name, a.category || null, a.iconName || null]
          );
        }
      }
    }

    res.json({ success: true, message: 'Listing updated successfully.', data: { listing: updated } });
  }),

  deleteListing: asyncHandler(async (req, res) => {
    const existing = await queryOne(
      'SELECT id, host_id FROM listings WHERE id = $1',
      [req.params.id]
    );
    if (!existing) throw new AppError('Listing not found.', 404, 'NOT_FOUND');
    if (existing.host_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to delete this listing.', 403, 'FORBIDDEN');
    }

    await query(
      'UPDATE listings SET is_active = false WHERE id = $1',
      [req.params.id]
    );

    res.json({ success: true, message: 'Listing deleted successfully.' });
  }),
};

// --------------------------------------------------------------------------
// Booking Controller — reservation management with payment integration
// --------------------------------------------------------------------------
const bookingController = {
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

    const conflict = await queryOne(
      `SELECT id FROM bookings
       WHERE listing_id = $1 AND status IN ('pending','confirmed')
       AND check_in_date < $3 AND check_out_date > $2`,
      [listingId, checkInDate, checkOutDate]
    );
    if (conflict) throw new AppError('Dates are no longer available.', 409, 'CONFLICT');

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

    const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
    const baseAmount = parseFloat(listing.price_per_night) * nights;
    const cleaningFee = parseFloat(listing.cleaning_fee) || 0;
    const serviceFee = Math.min(
      Math.max(Math.round(baseAmount * (CONFIG.payment.serviceFeePercent / 100)), CONFIG.payment.serviceFeeMin),
      CONFIG.payment.serviceFeeMax
    );
    const totalAmount = baseAmount + cleaningFee + serviceFee;

    const expiryTime = new Date(Date.now() + CONFIG.features.paymentTimeoutMinutes * 60 * 1000);

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

  getGuestBookings: asyncHandler(async (req, res) => {
    await bookingController.expireUnpaidBookings();
    
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

  getHostBookings: asyncHandler(async (req, res) => {
    await bookingController.expireUnpaidBookings();

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

  verifyPayment: asyncHandler(async (req, res) => {
    const { action, reason } = req.body;
    
    let newStatus;
    if (action === 'verify') {
      newStatus = 'completed';
    } else if (action === 'review') {
      newStatus = 'pending_review';
    } else {
      newStatus = 'failed';
    }

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

// --------------------------------------------------------------------------
// User Controller — user profile management and host upgrades
// --------------------------------------------------------------------------
const userController = {
  becomeHost: asyncHandler(async (req, res) => {
    const user = await queryOne('SELECT id, role FROM users WHERE id = $1', [req.user.id]);
    
    if (!user) {
      throw new AppError('User not found.', 404, 'NOT_FOUND');
    }
    
    if (user.role === 'host' || user.role === 'admin') {
      throw new AppError(`User is already a ${user.role}.`, 400, 'VALIDATION_ERROR');
    }

    const updated = await queryOne(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role, first_name, last_name',
      ['host', req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Congratulations! You are now a host.',
      data: { user: updated },
    });
  }),
};

// --------------------------------------------------------------------------
// Host Application Controller — handles guest-to-host upgrade requests
// --------------------------------------------------------------------------
const hostApplicationController = {
  apply: asyncHandler(async (req, res) => {
    const { idType, idNumber, idFrontImageUrl, idBackImageUrl, hostingExperience, propertyCount, motivation } = req.body;

    const user = await queryOne('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
    if (user.role === 'host' || user.role === 'admin') {
      throw new AppError(`You are already a ${user.role}.`, 409, 'CONFLICT');
    }

    const existingPending = await queryOne(
      "SELECT id FROM user_verifications WHERE user_id = $1 AND status = 'pending'",
      [req.user.id]
    );
    if (existingPending) {
      throw new AppError('You already have a pending application. Please wait for admin review.', 409, 'CONFLICT');
    }

    const application = await queryOne(
      `INSERT INTO user_verifications (
        user_id, id_type, id_number, id_front_image_url, id_back_image_url,
        status, hosting_experience, property_count, motivation
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)
      RETURNING id, user_id, status, created_at`,
      [
        req.user.id, idType, idNumber, idFrontImageUrl, idBackImageUrl || null,
        hostingExperience, propertyCount, motivation || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Your application has been submitted successfully. We will review it within 24-48 hours.',
      data: { application },
    });
  }),

  getStatus: asyncHandler(async (req, res) => {
    const application = await queryOne(
      `SELECT id, id_type, status, review_notes, reviewed_at, created_at 
       FROM user_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      data: { application },
    });
  }),
};

// --------------------------------------------------------------------------
// Upload Controller — handles image uploads to Cloudinary
// --------------------------------------------------------------------------
const uploadController = {
  uploadImage: asyncHandler(async (req, res) => {
    const { image, folder = 'general' } = req.body;

    if (!image || !image.startsWith('data:image')) {
      throw new AppError('Invalid image data. Please provide a valid base64 image.', 400, 'VALIDATION_ERROR');
    }

    const estimatedSizeBytes = (image.length * 3) / 4;
    if (estimatedSizeBytes > CONFIG.upload.maxFileSizeBytes) {
      throw new AppError(
        `Image too large. Maximum size is ${CONFIG.upload.maxFileSizeBytes / (1024 * 1024)}MB.`,
        400,
        'FILE_TOO_LARGE'
      );
    }

    try {
      const fullFolder = `${CONFIG.upload.rootFolder}/${folder}`;

      const result = await cloudinary.uploader.upload(image, {
        folder: fullFolder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
        ],
        responsive_breakpoints: [
          {
            create_derived: true,
            bytes_step: 20000,
            min_width: 200,
            max_width: 1000,
            max_images: 5,
          },
        ],
      });

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully.',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          folder: fullFolder,
        },
      });
    } catch (err) {
      console.error('Cloudinary upload error:', err.message);
      throw new AppError('Failed to upload image to cloud storage.', 500, 'UPLOAD_ERROR');
    }
  }),

  deleteImage: asyncHandler(async (req, res) => {
    const { publicId } = req.body;

    if (!publicId || typeof publicId !== 'string') {
      throw new AppError('Invalid public ID. Please provide a valid Cloudinary public ID.', 400, 'VALIDATION_ERROR');
    }

    if (!publicId.startsWith(`${CONFIG.upload.rootFolder}/`)) {
      throw new AppError('Access denied. Cannot delete assets outside the application folder.', 403, 'FORBIDDEN');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new AppError('Failed to delete image from cloud storage.', 500, 'DELETE_ERROR');
      }

      res.status(200).json({
        success: true,
        message: 'Image deleted successfully.',
        data: { publicId, result: result.result },
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.error('Cloudinary delete error:', err.message);
      throw new AppError('Failed to delete image from cloud storage.', 500, 'DELETE_ERROR');
    }
  }),
};

// --------------------------------------------------------------------------
// Review Controller — handles guest reviews and host responses
// --------------------------------------------------------------------------
const reviewController = {
  createReview: asyncHandler(async (req, res) => {
    const { bookingId, cleanliness, accuracy, communication, location, value, reviewText } = req.body;

    const booking = await queryOne(
      `SELECT * FROM bookings WHERE id = $1 AND guest_id = $2`,
      [bookingId, req.user.id]
    );

    if (!booking) {
      throw new AppError('Booking not found or you are not the guest for this booking.', 404, 'NOT_FOUND');
    }

    if (booking.status !== 'completed') {
      throw new AppError('You can only review completed bookings.', 400, 'VALIDATION_ERROR');
    }

    const existingReview = await queryOne(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [bookingId]
    );

    if (existingReview) {
      throw new AppError('You have already reviewed this booking.', 409, 'CONFLICT');
    }

    const review = await queryOne(
      `INSERT INTO reviews (
        booking_id, listing_id, reviewer_id, reviewee_id,
        rating_cleanliness, rating_accuracy, rating_communication,
        rating_location, rating_value, review_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        bookingId,
        booking.listing_id,
        req.user.id,
        booking.host_id,
        cleanliness,
        accuracy,
        communication,
        location,
        value,
        reviewText || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: { review },
    });
  }),

  addHostResponse: asyncHandler(async (req, res) => {
    const { responseText } = req.body;

    const review = await queryOne(
      'SELECT * FROM reviews WHERE id = $1',
      [req.params.id]
    );

    if (!review) {
      throw new AppError('Review not found.', 404, 'NOT_FOUND');
    }

    if (review.reviewee_id !== req.user.id) {
      throw new AppError('You can only respond to reviews on your own listings.', 403, 'FORBIDDEN');
    }

    if (review.host_response) {
      throw new AppError('You have already responded to this review.', 400, 'VALIDATION_ERROR');
    }

    const updated = await queryOne(
      `UPDATE reviews SET host_response = $1, host_response_at = NOW()
       WHERE id = $2 RETURNING *`,
      [responseText, req.params.id]
    );

    res.status(200).json({
      success: true,
      message: 'Response added successfully.',
      data: { review: updated },
    });
  }),

  getListingReviews: asyncHandler(async (req, res) => {
    const listingId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;

    const summary = await queryOne(
      `SELECT COUNT(*) as total_reviews,
              ROUND(AVG(rating_overall)::numeric, 1) as avg_rating,
              ROUND(AVG(rating_cleanliness)::numeric, 1) as avg_cleanliness,
              ROUND(AVG(rating_accuracy)::numeric, 1) as avg_accuracy,
              ROUND(AVG(rating_communication)::numeric, 1) as avg_communication,
              ROUND(AVG(rating_location)::numeric, 1) as avg_location,
              ROUND(AVG(rating_value)::numeric, 1) as avg_value
       FROM reviews WHERE listing_id = $1`,
      [listingId]
    );

    const countResult = await queryOne(
      'SELECT COUNT(*) as total FROM reviews WHERE listing_id = $1',
      [listingId]
    );

    const reviews = await query(
      `SELECT r.*, u.first_name as reviewer_first_name, u.last_name as reviewer_last_name,
              u.profile_image_url as reviewer_image_url
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.listing_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [listingId, limit, offset]
    );

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalReviews: parseInt(summary.total_reviews, 10),
          avgRating: parseFloat(summary.avg_rating) || 0,
          ratings: {
            cleanliness: parseFloat(summary.avg_cleanliness) || 0,
            accuracy: parseFloat(summary.avg_accuracy) || 0,
            communication: parseFloat(summary.avg_communication) || 0,
            location: parseFloat(summary.avg_location) || 0,
            value: parseFloat(summary.avg_value) || 0,
          },
        },
        reviews: reviews.rows,
      },
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    });
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

// ---- Auth Routes ----
app.post('/api/auth/register', validateBody(schemas.register), authController.register);
app.post('/api/auth/login', validateBody(schemas.login), authController.login);
app.get('/api/auth/me', authenticate, authController.getMe);
app.post('/api/auth/refresh-token', authController.refreshToken);
app.post('/api/auth/logout', authController.logout);

// ---- Listing Routes ----
app.post('/api/listings', authenticate, authorize('host', 'admin'), validateBody(schemas.createListing), listingController.createListing);
app.get('/api/listings', listingController.searchListings);
app.get('/api/listings/:id', listingController.getListingById);

// ---- Host Listing Management Routes ----
app.get('/api/listings/host', authenticate, authorize('host', 'admin'), listingController.getHostListings);
app.put('/api/listings/:id', authenticate, authorize('host', 'admin'), validateBody(schemas.updateListing), listingController.updateListing);
app.delete('/api/listings/:id', authenticate, authorize('host', 'admin'), listingController.deleteListing);

// ---- Blocked dates and similar listings routes ----
app.get('/api/listings/:id/blocked-dates', listingController.getBlockedDates);
app.get('/api/listings/:id/similar', listingController.getSimilarListings);

// ---- Booking Routes ----
app.post(
  '/api/bookings',
  authenticate,
  authorize('guest', 'host', 'admin'),
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

// ---- User Routes ----
app.post('/api/users/become-host', authenticate, authorize('guest'), userController.becomeHost);

// ---- Host Application Routes ----
app.post('/api/users/apply-host', authenticate, validateBody(schemas.hostApplication), hostApplicationController.apply);
app.get('/api/users/host-application-status', authenticate, hostApplicationController.getStatus);

// ---- Upload Routes ----
app.post('/api/upload', authenticate, validateBody(schemas.uploadImage), uploadController.uploadImage);
app.delete('/api/upload', authenticate, uploadController.deleteImage);

// ---- Review Routes ----
app.post('/api/reviews', authenticate, validateBody(schemas.createReview), reviewController.createReview);
app.post('/api/reviews/:id/response', authenticate, validateBody(schemas.addHostResponse), reviewController.addHostResponse);
app.get('/api/listings/:id/reviews', reviewController.getListingReviews);

// ---- Root ----
app.get('/', (req, res) => {
  res.json({ success: true, name: 'ROOSTAY API', version: '1.0.0', environment: CONFIG.app.env });
});

// ---- 404 Handler ----
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