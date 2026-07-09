// packages/api/routes/auth.routes.js
// Authentication routes - handles user registration, login, logout, and token management
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware');
const validateRequest = require('../middleware/validate');
const rateLimiter = require('../middleware/rateLimiter');

const authValidator = require('../validators/auth.validator');
const authController = require('../controllers/auth.controller');

// ============================================================================
// PUBLIC AUTH ROUTES
// ============================================================================
router.post(
  '/auth/register',
  rateLimiter('auth'),
  validateRequest({ body: authValidator.register }),
  authController.register
);

router.post(
  '/auth/login',
  rateLimiter('auth'),
  validateRequest({ body: authValidator.login }),
  authController.login
);

// THIS IS THE ROUTE THAT WAS MISSING AND CAUSING THE 404
router.post(
  '/auth/refresh-token',
  rateLimiter('auth'),
  authController.refreshToken 
);

// ============================================================================
// AUTHENTICATED AUTH ROUTES
// ============================================================================
router.post(
  '/auth/logout',
  authenticate,
  authController.logout
);

router.post(
  '/auth/change-password',
  authenticate,
  rateLimiter('auth'),
  validateRequest({ body: authValidator.changePassword }),
  authController.changePassword
);

router.get(
  '/auth/me',
  authenticate,
  authController.getMe
);

module.exports = router;