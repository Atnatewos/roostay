// packages/middleware/authorize.js
// Role-based authorization middleware for Express
// Restricts access to routes based on user roles
// Must be used after the authenticate middleware

const { ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Authorization middleware factory that restricts access by role.
 * Accepts one or more roles and allows access only if the authenticated
 * user has one of the specified roles.
 *
 * Usage:
 *   router.get('/admin/users', authenticate, authorize('admin'), adminController.getUsers);
 *   router.get('/dashboard', authenticate, authorize('host', 'admin'), dashboardController.getStats);
 *
 * @param {...string} roles - One or more allowed roles (guest, host, admin)
 * @returns {Function} Express middleware function
 */
function authorize(...roles) {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        throw new ForbiddenError('Authentication required before authorization.');
      }

      // Check if the user's role is in the allowed roles list
      if (!roles.includes(req.user.role)) {
        logger.warn('Authorization denied', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.originalUrl,
          method: req.method,
        });

        throw new ForbiddenError(
          `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}.`
        );
      }

      logger.debug('Authorization granted', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: roles,
        path: req.originalUrl,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Authorization middleware that checks if the authenticated user
 * is the owner of a resource. The resource owner ID is determined
 * by a function that receives the request object.
 *
 * Usage:
 *   router.put('/listings/:id', authenticate, isOwner(req => req.params.id, 'listing'), listingController.update);
 *
 * @param {Function} ownerIdExtractor - Function that extracts the owner ID from the request
 * @param {string} resourceName - Name of the resource for error messages
 * @returns {Function} Express middleware function
 */
function isOwner(ownerIdExtractor, resourceName = 'resource') {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required.');
      }

      const ownerId = ownerIdExtractor(req);

      // Admin can access any resource
      if (req.user.role === 'admin') {
        logger.debug('Admin bypassing ownership check', {
          userId: req.user.id,
          resourceName,
          ownerId,
        });
        return next();
      }

      // Check if the authenticated user is the owner
      if (req.user.id !== ownerId) {
        logger.warn('Ownership check failed', {
          userId: req.user.id,
          ownerId,
          resourceName,
          path: req.originalUrl,
        });

        throw new ForbiddenError(
          `You do not have permission to access this ${resourceName}.`
        );
      }

      logger.debug('Ownership verified', {
        userId: req.user.id,
        resourceName,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authorize,
  isOwner,
};