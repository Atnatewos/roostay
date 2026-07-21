// packages/api/routes/user.routes.js
// User profile and management routes
// All endpoints require authentication
const express = require('express');
const router = express.Router();

// Middleware
const { authenticate, authorize } = require('../../middleware');
const validateRequest = require('../../middleware/validate');

// Validators & Controllers
const userValidator = require('../validators/user.validator');
const userController = require('../controllers/user.controller');

// ============================================================================
// USER PROFILE ROUTES
// ============================================================================
router.get(
  '/users/profile',
  authenticate,
  userController.getProfile
);

router.put(
  '/users/profile',
  authenticate,
  validateRequest({ body: userValidator.updateProfile }),
  userController.updateProfile
);

router.get(
  '/users/:id',
  authenticate,
  userController.getUserById
);

// ============================================================================
// HOST UPGRADE ROUTE
// ============================================================================
router.post(
  '/users/become-host',
  authenticate,
  authorize('guest'), // Only guests can upgrade themselves
  userController.becomeHost
);

module.exports = router;