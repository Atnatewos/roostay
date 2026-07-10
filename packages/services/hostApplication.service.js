// packages/services/hostApplication.service.js
// Host application service - handles submission and status retrieval
// Validates user eligibility and prevents duplicate pending applications
// All database operations use parameterized queries for security
const { query, queryOne } = require('../database');
const { ValidationError, ConflictError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

const hostApplicationService = {
  /**
   * Submits a new host application for the authenticated user.
   * Checks if the user is already a host/admin or has a pending application.
   * 
   * @param {string} userId - The authenticated user's ID
   * @param {Object} applicationData - Form data from the frontend
   * @returns {Promise<Object>} The created application record
   */
  async apply(userId, applicationData) {
    // Verify user exists and check current role
    const user = await queryOne('SELECT role FROM users WHERE id = $1', [userId]);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    if (user.role === 'host' || user.role === 'admin') {
      throw new ConflictError(`You are already a ${user.role}.`);
    }

    // Check for existing pending application to prevent spam
    const existingPending = await queryOne(
      "SELECT id FROM user_verifications WHERE user_id = $1 AND status = 'pending'",
      [userId]
    );
    if (existingPending) {
      throw new ConflictError('You already have a pending application. Please wait for admin review.');
    }

    // Insert the application into the user_verifications table
    // Note: Requires the database migration to be run for the new columns
    const application = await queryOne(
      `INSERT INTO user_verifications (
        user_id, id_type, id_number, id_front_image_url, id_back_image_url,
        status, hosting_experience, property_count, motivation
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)
      RETURNING id, user_id, status, created_at`,
      [
        userId,
        applicationData.idType,
        applicationData.idNumber,
        applicationData.idFrontImageUrl,
        applicationData.idBackImageUrl || null,
        applicationData.hostingExperience,
        applicationData.propertyCount,
        applicationData.motivation || null,
      ]
    );

    logger.info('Host application submitted', { 
      userId, 
      applicationId: application.id,
      idType: applicationData.idType 
    });

    return application;
  },

  /**
   * Retrieves the latest host application status for a user.
   * 
   * @param {string} userId - The authenticated user's ID
   * @returns {Promise<Object|null>} The latest application record or null
   */
  async getApplicationStatus(userId) {
    const application = await queryOne(
      `SELECT id, id_type, status, review_notes, reviewed_at, created_at 
       FROM user_verifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );
    return application;
  },
};

module.exports = hostApplicationService;