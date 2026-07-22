// packages/utils/index.js
// Barrel export for all utility modules
// Author: Theron

const { asyncHandler } = require('./asyncHandler');
const { errorHandler, notFoundHandler } = require('./errorHandler');
const { AppError, ValidationError, AuthError, ForbiddenError, NotFoundError, ConflictError, RateLimitError, PaymentError } = require('./errors');
const logger = require('./logger');
const events = require('./events');
const { generateAccessToken, generateRefreshToken, generateTokenPair, verifyAccessToken, verifyRefreshToken, extractTokenFromHeader } = require('./token');
const { parsePagination, buildPaginationMeta, paginatedResponse, paginationSql } = require('./pagination');
const { cloudinary, uploadToCloudinary, deleteFromCloudinary } = require('./cloudinary');
const { validate, sanitize, safeTruncate } = require('./validator');

module.exports = {
  // Async handler
  asyncHandler,

  // Error handling
  errorHandler,
  notFoundHandler,

  // Error classes
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  PaymentError,

  // Logging & Observability
  logger,
  events,

  // JWT Tokens
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,

  // Pagination
  parsePagination,
  buildPaginationMeta,
  paginatedResponse,
  paginationSql,

  // Cloudinary
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,

  // Validation & Sanitization
  validate,
  sanitize,
  safeTruncate,
};