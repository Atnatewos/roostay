// packages/services/user.service.js
// User service - handles all user-related business logic
// Registration, authentication, profile management, verification, and role upgrades
// All database queries use parameterized statements for SQL injection prevention
const bcrypt = require('bcryptjs');
const { query, queryOne, queryExists } = require('../database');
const { generateTokenPair, verifyRefreshToken } = require('../utils/token');
const { AuthError, ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    auth: {
      bcryptSaltRounds: 12,
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
    },
    features: {
      registrationEnabled: true,
    },
  };
}

const userService = {
  /**
   * Registers a new user account.
   * Validates input, hashes password, and creates the user record.
   * Returns tokens for immediate authentication after registration.
   * 
   * @param {Object} userData - Registration data { email, password, firstName, lastName, phoneNumber }
   * @returns {Promise<Object>} Created user with tokens
   */
  async register(userData) {
    if (!config.features.registrationEnabled) {
      throw new ValidationError('New account registration is currently disabled.');
    }
    const { email, password, firstName, lastName, phoneNumber } = userData;

    if (email) {
      const existingEmail = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (existingEmail) throw new ConflictError('An account with this email already exists.');
    }

    if (phoneNumber) {
      const existingPhone = await queryOne('SELECT id FROM users WHERE phone_number = $1', [phoneNumber]);
      if (existingPhone) throw new ConflictError('An account with this phone number already exists.');
    }

    const saltRounds = config.auth.bcryptSaltRounds || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await queryOne(
      `INSERT INTO users (email, phone_number, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, phone_number, first_name, last_name, role, is_verified, created_at`,
      [email ? email.toLowerCase().trim() : null, phoneNumber || null, passwordHash, firstName.trim(), lastName.trim(), 'guest']
    );

    const tokens = generateTokenPair(newUser);
    logger.info('User registered successfully', { userId: newUser.id, email: newUser.email });

    return {
      user: {
        id: newUser.id, email: newUser.email, phoneNumber: newUser.phone_number,
        firstName: newUser.first_name, lastName: newUser.last_name,
        role: newUser.role, isVerified: newUser.is_verified, createdAt: newUser.created_at,
      },
      tokens,
    };
  },

  /**
   * Authenticates a user with email and password.
   * Implements login attempt tracking and account lockout protection.
   * 
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Authenticated user with tokens
   */
  async login(email, password) {
    const user = await queryOne(
      `SELECT id, email, phone_number, first_name, last_name, password_hash, role, is_verified, is_active, login_attempts, locked_until 
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!user) throw new AuthError('Invalid email or password.');
    if (!user.is_active) throw new AuthError('Your account has been deactivated. Please contact support.');

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      throw new AuthError(`Account temporarily locked. Please try again in ${minutesLeft} minute(s).`);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const attempts = (user.login_attempts || 0) + 1;
      const maxAttempts = config.auth.maxLoginAttempts || 5;
      if (attempts >= maxAttempts) {
        const lockoutMinutes = config.auth.lockoutDurationMinutes || 15;
        const lockedUntil = new Date(Date.now() + lockoutMinutes * 60000);
        await query('UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3', [attempts, lockedUntil, user.id]);
        logger.warn('Account locked due to failed attempts', { userId: user.id, attempts });
        throw new AuthError(`Account locked after ${maxAttempts} failed attempts.`);
      }
      await query('UPDATE users SET login_attempts = $1 WHERE id = $2', [attempts, user.id]);
      throw new AuthError('Invalid email or password.');
    }

    await query(`UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1`, [user.id]);

    const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
    logger.info('User logged in successfully', { userId: user.id, role: user.role });

    return {
      user: {
        id: user.id, email: user.email, phoneNumber: user.phone_number,
        firstName: user.first_name, lastName: user.last_name,
        role: user.role, isVerified: user.is_verified,
      },
      tokens,
    };
  },

  /**
   * Refreshes an expired access token using a valid refresh token.
   * 
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<Object>} New token pair
   */
  async refreshToken(refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await queryOne('SELECT id, email, role, is_active FROM users WHERE id = $1', [decoded.sub]);
    
    if (!user) throw new AuthError('User no longer exists.');
    if (!user.is_active) throw new AuthError('Account has been deactivated.');
    
    const tokens = generateTokenPair({ id: user.id, email: user.email, role: user.role });
    logger.debug('Token refreshed', { userId: user.id });
    
    return { tokens };
  },

  /**
   * Retrieves a user by their ID.
   * 
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} User profile data
   */
  async getProfile(userId) {
    const user = await queryOne(
      `SELECT id, email, phone_number, first_name, last_name, profile_image_url, role, is_verified, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );
    if (!user) throw new NotFoundError('User not found.');
    return {
      id: user.id, email: user.email, phoneNumber: user.phone_number,
      firstName: user.first_name, lastName: user.last_name,
      profileImageUrl: user.profile_image_url, role: user.role,
      isVerified: user.is_verified, createdAt: user.created_at,
    };
  },

  /**
   * Updates a user's profile information.
   * 
   * @param {string} userId - The user ID
   * @param {Object} updates - Fields to update { firstName, lastName, phoneNumber, profileImageUrl }
   * @returns {Promise<Object>} Updated user profile
   */
  async updateProfile(userId, updates) {
    const allowedFields = ['first_name', 'last_name', 'phone_number', 'profile_image_url'];
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    const fieldMap = {
      firstName: 'first_name', lastName: 'last_name',
      phoneNumber: 'phone_number', profileImageUrl: 'profile_image_url',
    };

    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMap[key];
      if (dbField && value !== undefined && value !== null) {
        setClauses.push(`${dbField} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) throw new ValidationError('No valid fields to update.');
    params.push(userId);

    const updatedUser = await queryOne(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, email, phone_number, first_name, last_name, profile_image_url, role, is_verified`,
      params
    );

    if (!updatedUser) throw new NotFoundError('User not found.');
    logger.info('User profile updated', { userId });
    return {
      id: updatedUser.id, email: updatedUser.email, phoneNumber: updatedUser.phone_number,
      firstName: updatedUser.first_name, lastName: updatedUser.last_name,
      profileImageUrl: updatedUser.profile_image_url, role: updatedUser.role, isVerified: updatedUser.is_verified,
    };
  },

  /**
   * Changes a user's password.
   * 
   * @param {string} userId - The user ID
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password to set
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await queryOne('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!user) throw new NotFoundError('User not found.');
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) throw new AuthError('Current password is incorrect.');

    const saltRounds = config.auth.bcryptSaltRounds || 12;
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
    logger.info('Password changed successfully', { userId });
  },

  /**
   * Lists users with pagination (admin only).
   * 
   * @param {Object} options - Query options { page, limit, role, isVerified, isActive, search }
   * @returns {Promise<Object>} Paginated user list with metadata
   */
  async listUsers(options = {}) {
    const { page = 1, limit = 20, role, isVerified, isActive, search } = options;
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) { whereClause += ` AND role = $${paramIndex}`; params.push(role); paramIndex++; }
    if (isVerified !== undefined) { whereClause += ` AND is_verified = $${paramIndex}`; params.push(isVerified); paramIndex++; }
    if (isActive !== undefined) { whereClause += ` AND is_active = $${paramIndex}`; params.push(isActive); paramIndex++; }
    if (search) {
      whereClause += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`); paramIndex++;
    }

    const countResult = await queryOne(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    params.push(limit); params.push(offset);

    const users = await query(
      `SELECT id, email, phone_number, first_name, last_name, profile_image_url,
              role, is_verified, is_active, last_login_at, created_at
       FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return {
      users: users.rows.map((u) => ({
        id: u.id, email: u.email, phoneNumber: u.phone_number,
        firstName: u.first_name, lastName: u.last_name, profileImageUrl: u.profile_image_url,
        role: u.role, isVerified: u.is_verified, isActive: u.is_active,
        lastLoginAt: u.last_login_at, createdAt: u.created_at,
      })),
      pagination: {
        page, limit, totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },

  /**
   * Upgrades a guest user to a host role.
   * Validates that the user exists and is not already a host or admin.
   * 
   * @param {string} userId - The user ID to upgrade
   * @returns {Promise<Object>} Updated user record
   */
  async becomeHost(userId) {
    const user = await queryOne('SELECT id, role FROM users WHERE id = $1', [userId]);
    
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    
    if (user.role === 'host' || user.role === 'admin') {
      throw new ValidationError(`User is already a ${user.role}.`);
    }

    const updated = await queryOne(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role, first_name, last_name',
      ['host', userId]
    );

    logger.info('User upgraded to host', { userId, newRole: 'host' });
    return updated;
  },
};

module.exports = userService;