// packages/api/routes/upload.routes.js
// Secure file upload routes - handles image uploads to Cloudinary
// Requires authentication and applies Multer middleware for file parsing
const express = require('express');
const router = express.Router();

// Middleware
const { authenticate } = require('../../middleware');
const { uploadMultiple } = require('../../middleware/upload');

// Controllers
const uploadController = require('../controllers/upload.controller');

// ============================================================================
// UPLOAD ROUTES
// ============================================================================
router.post(
  '/upload',
  authenticate,
  uploadMultiple('images', 10),
  uploadController.uploadImages
);

module.exports = router;