// packages/api/routes/hostApplication.routes.js
// Host application routes - handles guest-to-host upgrade requests
// All endpoints require authentication
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware');
const validateRequest = require('../middleware/validate');
const hostApplicationValidator = require('../validators/hostApplication.validator');
const hostApplicationController = require('../controllers/hostApplication.controller');

// ============================================================================
// HOST APPLICATION ROUTES
// ============================================================================

// Submit a new host application
router.post(
  '/users/apply-host',
  authenticate,
  validateRequest({ body: hostApplicationValidator.apply }),
  hostApplicationController.apply
);

// Get the current user's application status
router.get(
  '/users/host-application-status',
  authenticate,
  hostApplicationController.getStatus
);

module.exports = router;