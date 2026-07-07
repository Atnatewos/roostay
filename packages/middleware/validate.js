// packages/middleware/validate.js
// Request validation middleware for Express
// Validates request body, query parameters, and URL params using Joi schemas
// Strips unknown fields for security and throws ValidationError on failure

const { validate } = require('../utils/validator');
const logger = require('../utils/logger');

/**
 * Creates validation middleware for Express routes.
 * Validates request body, query, and params against provided Joi schemas.
 * Only validates the parts of the request that have corresponding schemas.
 * Unknown fields are stripped automatically for security.
 *
 * Usage:
 *   router.post('/register',
 *     validateRequest({ body: registerSchema }),
 *     authController.register
 *   );
 *
 *   router.get('/listings',
 *     validateRequest({ query: listingQuerySchema }),
 *     listingController.search
 *   );
 *
 *   router.put('/listings/:id',
 *     validateRequest({ body: updateListingSchema, params: paramsWithIdSchema }),
 *     listingController.update
 *   );
 *
 * @param {Object} schemas - Object with optional body, query, and params Joi schemas
 * @param {Joi.Schema} [schemas.body] - Schema for validating req.body
 * @param {Joi.Schema} [schemas.query] - Schema for validating req.query
 * @param {Joi.Schema} [schemas.params] - Schema for validating req.params
 * @returns {Function} Express middleware function
 */
function validateRequest(schemas = {}) {
  return (req, res, next) => {
    try {
      // Validate request body if schema is provided
      if (schemas.body) {
        req.body = validate(req.body, schemas.body, 'request body');
        logger.debug('Request body validated', {
          path: req.originalUrl,
          method: req.method,
        });
      }

      // Validate query parameters if schema is provided
      if (schemas.query) {
        req.query = validate(req.query, schemas.query, 'query parameters');
        logger.debug('Query parameters validated', {
          path: req.originalUrl,
          method: req.method,
        });
      }

      // Validate URL params if schema is provided
      if (schemas.params) {
        req.params = validate(req.params, schemas.params, 'URL parameters');
        logger.debug('URL parameters validated', {
          path: req.originalUrl,
          method: req.method,
        });
      }

      next();
    } catch (error) {
      logger.warn('Request validation failed', {
        path: req.originalUrl,
        method: req.method,
        error: error.message,
        details: error.details,
      });

      next(error);
    }
  };
}

module.exports = validateRequest;