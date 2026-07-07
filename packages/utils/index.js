const logger = require('./logger');
const errors = require('./errors');
const { errorHandler, notFoundHandler } = require('./errorHandler');
const { validate, patterns } = require('./validator');
const { asyncHandler } = require('./asyncHandler');
const pagination = require('./pagination');
const token = require('./token');

module.exports = {
  logger,
  ...errors,
  errorHandler,
  notFoundHandler,
  validate,
  validationPatterns: patterns,
  asyncHandler,
  ...pagination,
  ...token,
};