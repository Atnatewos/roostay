// packages/middleware/index.js
// Barrel export for all middleware modules
// Provides a single import point for all Express middleware

const { authenticate, optionalAuth } = require('./authenticate');
const { authorize, isOwner } = require('./authorize');
const createCorsMiddleware = require('./cors');
const rateLimiter = require('./rateLimiter');
const validateRequest = require('./validate');
const { uploadSingle, uploadMultiple } = require('./upload');

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  isOwner,
  createCorsMiddleware,
  rateLimiter,
  validateRequest,
  uploadSingle,
  uploadMultiple,
};