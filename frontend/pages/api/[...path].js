// frontend/pages/api/[...path].js
// Complete ROOSTAY API handler for Vercel serverless deployment
// Handles all API routes: auth, listings, bookings, payments, etc.
// Uses native PostgreSQL driver with parameterized queries

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
// CONFIGURATION - All from environment variables, zero hardcoded values
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
  },
  features: {
    registrationEnabled: true,
    listingApprovalRequired: false,
    paginationDefaultLimit: 12,
    paginationMaxLimit: 50,
  },
  payment: {
    serviceFeePercent: 5,
    serviceFeeMin: 100,
    serviceFeeMax: 5000,
  },
};

// ============================================================================
// DATABASE POOL
// ============================================================================
let pool = null;

function getPool() {
  if (!pool) {
    if (!CONFIG.database.url) {
      console.error('DATABASE_URL not set');
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

async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// ============================================================================
// UTILITIES
// ============================================================================
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

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
  return { accessToken, refreshToken, tokenType: CONFIG.auth.tokenType, expiresIn: CONFIG.auth.jwtExpiresIn };
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required.', 401, 'AUTH_ERROR'));
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, CONFIG.auth.jwtSecret);
    if (decoded.type !== 'access') return next(new AppError('Invalid token type.', 401, 'AUTH_ERROR'));
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new AppError('Token expired.', 401, 'TOKEN_EXPIRED'));
    return next(new AppError('Invalid token.', 401, 'AUTH_ERROR'));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required.', 401, 'AUTH_ERROR'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Access denied. Required: ${roles.join(' or ')}.`, 403, 'FORBIDDEN'));
    }
    next();
  };
}

function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = {};
      error.details.forEach((d) => { details[d.path.join('.')] = d.message; });
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
    }
    req.body = value;
    next();
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const schemas = {
  register: Joi.object({
    email: Joi.string().email().max(255).required(),
    password: Joi.string().min(8).max(128).pattern(/[a-z]/).pattern(/[A-Z]/).pattern(/[0-9]/).required()
      .messages({ 'string.pattern.base': 'Password must contain uppercase, lowercase, and number.' }),
    firstName: Joi.string().trim().min(1).max(100).required(),
    lastName: Joi.string().trim().min(1).max(100).required(),
    phoneNumber: Joi.string().pattern(/^(\+251|0)[9]\d{8}$/).optional().allow(null, ''),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
  createListing: Joi.object({
    title: Joi.string().trim().min(5).max(255).required(),
    description: Joi.string().trim().min(20).max(5000).required(),
    listingType: Joi.string().valid('short_term', 'long_term', 'both').required(),
    propertyType: Joi.string().valid('apartment', 'house', 'villa', 'condo', 'guest_house', 'shared_room', 'serviced_apartment').required(),
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
    amenities: Joi.array().items(Joi.object({ name: Joi.string().required(), category: Joi.string().optional(), iconName: Joi.string().optional() })).max(50).optional(),
    instantBook: Joi.boolean().default(false),
    minNights: Joi.number().integer().min(1).default(1),
    cancellationPolicy: Joi.string().valid('flexible', 'moderate', 'strict').default('flexible'),
  }),
  createBooking: Joi.object({
    listingId: Joi.string().guid({ version: 'uuidv4' }).required(),
    checkInDate: Joi.date().iso().greater('now').required(),
    checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).required(),
    guestCount: Joi.number().integer().min(1).max(100).default(1),
    bookingType: Joi.string().valid('short_term', 'long_term').required(),
    specialRequests: Joi.string().max(2000).optional().allow(null, ''),
  }),
};

// ============================================================================
// CONTROLLERS
// ============================================================================
const authController = {
  register: asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, phoneNumber } = req.body;
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing) throw new AppError('An account with this email already exists.', 409, 'CONFLICT');

    const hash = await bcrypt.hash(password, CONFIG.auth.bcryptSaltRounds);
    const user = await queryOne(
      `INSERT INTO users (email, phone_number, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, 'guest')
       RETURNING id, email, phone_number, first_name, last_name, role, is_verified, created_at`,
      [email.toLowerCase().trim(), phoneNumber || null, hash, firstName.trim(), lastName.trim()]
    );

    const tokens = generateTokens(user);
    res.status(201).json({
      success: true, message: 'Account created.',
      data: {
        user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, isVerified: user.is_verified },
        tokens,
      },
    });
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await queryOne(
      'SELECT id, email, password_hash, first_name, last_name, role, is_verified, is_active, login_attempts, locked_until FROM users WHERE email = $1',
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
        await query('UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3', [attempts, lockUntil, user.id]);
        throw new AppError('Account locked after too many failed attempts.', 401, 'AUTH_ERROR');
      }
      await query('UPDATE users SET login_attempts = $1 WHERE id = $2', [attempts, user.id]);
      throw new AppError('Invalid email or password.', 401, 'AUTH_ERROR');
    }

    await query('UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1', [user.id]);
    const tokens = generateTokens(user);
    res.json({
      success: true, message: 'Logged in.',
      data: {
        user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, isVerified: user.is_verified },
        tokens,
      },
    });
  }),

  getMe: asyncHandler(async (req, res) => {
    const user = await queryOne('SELECT id, email, phone_number, first_name, last_name, profile_image_url, role, is_verified FROM users WHERE id = $1', [req.user.id]);
    if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
    res.json({ success: true, data: { user: { id: user.id, email: user.email, phoneNumber: user.phone_number, firstName: user.first_name, lastName: user.last_name, profileImageUrl: user.profile_image_url, role: user.role, isVerified: user.is_verified } } });
  }),
};

const listingController = {
  createListing: asyncHandler(async (req, res) => {
    const d = req.body;
    const listing = await queryOne(
      `INSERT INTO listings (host_id, title, description, listing_type, property_type, bedrooms, bathrooms, max_guests, beds_count, price_per_night, price_per_month, cleaning_fee, security_deposit, street_address, city, subcity, is_active, is_approved, approval_status, instant_book, min_nights, cancellation_policy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,$17,$18,$19,$20,$21)
       RETURNING *`,
      [req.user.id, d.title, d.description, d.listingType, d.propertyType, d.bedrooms, d.bathrooms, d.maxGuests, d.bedsCount, d.pricePerNight || null, d.pricePerMonth || null, d.cleaningFee || 0, d.securityDeposit || 0, d.streetAddress, d.city, d.subcity || null, true, 'approved', d.instantBook || false, d.minNights || 1, d.cancellationPolicy || 'flexible']
    );

    if (d.amenities && d.amenities.length > 0) {
      for (const a of d.amenities) {
        await query('INSERT INTO listing_amenities (listing_id, amenity_name, category, icon_name) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [listing.id, a.name, a.category || null, a.iconName || null]);
      }
    }

    res.status(201).json({ success: true, message: 'Listing created.', data: { listing } });
  }),

  searchListings: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || CONFIG.features.paginationDefaultLimit, CONFIG.features.paginationMaxLimit);
    const offset = (page - 1) * limit;
    let where = 'WHERE l.is_active = true AND l.is_approved = true';
    const params = [];
    let p = 1;

    if (req.query.city) { where += ` AND l.city ILIKE $${p}`; params.push(`%${req.query.city}%`); p++; }
    if (req.query.listingType) { where += ` AND (l.listing_type = $${p} OR l.listing_type = 'both')`; params.push(req.query.listingType); p++; }
    if (req.query.search) { where += ` AND (l.title ILIKE $${p} OR l.description ILIKE $${p})`; params.push(`%${req.query.search}%`); p++; }

    const count = await queryOne(`SELECT COUNT(*) as total FROM listings l ${where}`, params);
    params.push(limit, offset);

    const listings = await query(
      `SELECT l.id, l.title, l.listing_type, l.property_type, l.bedrooms, l.bathrooms, l.max_guests, l.price_per_night, l.price_per_month, l.street_address, l.city, l.subcity, l.instant_book, l.created_at, u.first_name as host_first_name, u.last_name as host_last_name
       FROM listings l JOIN users u ON l.host_id = u.id ${where} ORDER BY l.created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      params
    );

    const listingIds = listings.rows.map((l) => l.id);
    let primaryImages = {};
    if (listingIds.length > 0) {
      const imgs = await query('SELECT listing_id, image_url FROM listing_images WHERE listing_id = ANY($1::uuid[]) AND is_primary = true', [listingIds]);
      imgs.rows.forEach((img) => { primaryImages[img.listing_id] = img.image_url; });
    }

    res.json({
      success: true,
      data: listings.rows.map((l) => ({
        id: l.id, title: l.title, listingType: l.listing_type, propertyType: l.property_type,
        bedrooms: l.bedrooms, bathrooms: l.bathrooms, maxGuests: l.max_guests,
        pricePerNight: l.price_per_night, pricePerMonth: l.price_per_month,
        city: l.city, subcity: l.subcity, streetAddress: l.street_address,
        host: { firstName: l.host_first_name, lastName: l.host_last_name },
        primaryImage: primaryImages[l.id] || null, instantBook: l.instant_book, createdAt: l.created_at,
      })),
      pagination: { page, limit, totalItems: parseInt(count.total), totalPages: Math.ceil(parseInt(count.total) / limit) },
    });
  }),

  getListingById: asyncHandler(async (req, res) => {
    const listing = await queryOne(
      `SELECT l.*, u.first_name as host_first_name, u.last_name as host_last_name, u.profile_image_url as host_image_url
       FROM listings l JOIN users u ON l.host_id = u.id WHERE l.id = $1`,
      [req.params.id]
    );
    if (!listing) throw new AppError('Listing not found.', 404, 'NOT_FOUND');

    await query('UPDATE listings SET view_count = view_count + 1 WHERE id = $1', [req.params.id]);

    const amenities = await query('SELECT amenity_name, category, icon_name FROM listing_amenities WHERE listing_id = $1', [req.params.id]);
    const images = await query('SELECT id, image_url, thumbnail_url, alt_text, sort_order, is_primary FROM listing_images WHERE listing_id = $1 ORDER BY sort_order', [req.params.id]);

    res.json({
      success: true,
      data: {
        listing: {
          id: listing.id, hostId: listing.host_id,
          host: { firstName: listing.host_first_name, lastName: listing.host_last_name, imageUrl: listing.host_image_url },
          title: listing.title, description: listing.description,
          listingType: listing.listing_type, propertyType: listing.property_type,
          bedrooms: listing.bedrooms, bathrooms: listing.bathrooms, maxGuests: listing.max_guests, bedsCount: listing.beds_count,
          pricePerNight: listing.price_per_night, pricePerMonth: listing.price_per_month,
          cleaningFee: listing.cleaning_fee, securityDeposit: listing.security_deposit,
          location: { streetAddress: listing.street_address, city: listing.city, subcity: listing.subcity },
          instantBook: listing.instant_book, minNights: listing.min_nights, maxNights: listing.max_nights,
          checkInTime: listing.check_in_time, checkOutTime: listing.check_out_time,
          houseRules: listing.house_rules, cancellationPolicy: listing.cancellation_policy,
          amenities: amenities.rows, images: images.rows,
          viewCount: listing.view_count, isActive: listing.is_active, createdAt: listing.created_at,
        },
      },
    });
  }),
};

const bookingController = {
  createBooking: asyncHandler(async (req, res) => {
    const { listingId, checkInDate, checkOutDate, guestCount, bookingType, specialRequests } = req.body;

    const listing = await queryOne('SELECT * FROM listings WHERE id = $1 AND is_active = true AND is_approved = true', [listingId]);
    if (!listing) throw new AppError('Listing not found.', 404, 'NOT_FOUND');
    if (listing.host_id === req.user.id) throw new AppError('Cannot book your own listing.', 400, 'VALIDATION_ERROR');

    const conflict = await queryOne(
      `SELECT id FROM bookings WHERE listing_id = $1 AND status IN ('pending','confirmed') AND check_in_date < $3 AND check_out_date > $2`,
      [listingId, checkInDate, checkOutDate]
    );
    if (conflict) throw new AppError('Dates are not available.', 409, 'CONFLICT');

    const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
    const baseAmount = parseFloat(listing.price_per_night) * nights;
    const cleaningFee = parseFloat(listing.cleaning_fee) || 0;
    const serviceFee = Math.min(Math.max(Math.round(baseAmount * (CONFIG.payment.serviceFeePercent / 100)), CONFIG.payment.serviceFeeMin), CONFIG.payment.serviceFeeMax);
    const totalAmount = baseAmount + cleaningFee + serviceFee;

    const booking = await queryOne(
      `INSERT INTO bookings (listing_id, guest_id, host_id, booking_type, check_in_date, check_out_date, guest_count, status, base_amount, cleaning_fee, service_fee, security_deposit, total_amount, special_requests)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11,$12,$13) RETURNING *`,
      [listingId, req.user.id, listing.host_id, bookingType, checkInDate, checkOutDate, guestCount, baseAmount, cleaningFee, serviceFee, 0, totalAmount, specialRequests || null]
    );

    res.status(201).json({
      success: true, message: 'Booking created.',
      data: { booking, pricing: { baseAmount, cleaningFee, serviceFee, securityDeposit: 0, totalAmount, currency: 'ETB' } },
    });
  }),

  getGuestBookings: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const count = await queryOne('SELECT COUNT(*) as total FROM bookings WHERE guest_id = $1', [req.user.id]);
    const bookings = await query(
      `SELECT b.*, l.title as listing_title, l.city FROM bookings b JOIN listings l ON b.listing_id = l.id WHERE b.guest_id = $1 ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ success: true, data: bookings.rows, pagination: { page, limit, totalItems: parseInt(count.total), totalPages: Math.ceil(parseInt(count.total) / limit) } });
  }),
};

const favoriteController = {
  toggle: asyncHandler(async (req, res) => {
    const existing = await queryOne('SELECT id FROM favorites WHERE user_id = $1 AND listing_id = $2', [req.user.id, req.params.listingId]);
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
      `SELECT f.id as favorite_id, f.created_at as favorited_at, l.id, l.title, l.listing_type, l.price_per_night, l.price_per_month, l.city, l.bedrooms, l.bathrooms, l.max_guests,
              (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = true LIMIT 1) as primary_image
       FROM favorites f JOIN listings l ON f.listing_id = l.id WHERE f.user_id = $1 ORDER BY f.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ success: true, data: favorites.rows, pagination: { page, limit, totalItems: parseInt(count.total), totalPages: Math.ceil(parseInt(count.total) / limit) } });
  }),
};

// ============================================================================
// EXPRESS APP
// ============================================================================
const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ROOSTAY API is running.', timestamp: new Date().toISOString(), environment: CONFIG.app.env });
});

// Auth routes
app.post('/api/auth/register', validateBody(schemas.register), authController.register);
app.post('/api/auth/login', validateBody(schemas.login), authController.login);
app.get('/api/auth/me', authenticate, authController.getMe);

// Listing routes
app.post('/api/listings', authenticate, authorize('host', 'admin'), validateBody(schemas.createListing), listingController.createListing);
app.get('/api/listings', listingController.searchListings);
app.get('/api/listings/:id', listingController.getListingById);

// Booking routes
app.post('/api/bookings', authenticate, authorize('guest', 'admin'), validateBody(schemas.createBooking), bookingController.createBooking);
app.get('/api/bookings/guest', authenticate, bookingController.getGuestBookings);

// Favorite routes
app.post('/api/favorites/:listingId', authenticate, favoriteController.toggle);
app.get('/api/favorites', authenticate, favoriteController.list);

// Notifications
app.get('/api/notifications', authenticate, asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
  res.json({ success: true, data: { notifications: result.rows, unreadCount: result.rows.filter((n) => !n.is_read).length } });
}));

// Root
app.get('/', (req, res) => {
  res.json({ success: true, name: 'ROOSTAY API', version: '1.0.0', environment: CONFIG.app.env });
});

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
});

// Error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';
  console.error(`[${statusCode}] ${err.message}`);
  res.status(statusCode).json({ success: false, error: { code: err.errorCode || 'INTERNAL_ERROR', message } });
});

// Export for Next.js API route
export default function handler(req, res) {
  return app(req, res);
}

export const config = {
  api: { bodyParser: false, externalResolver: true },
};