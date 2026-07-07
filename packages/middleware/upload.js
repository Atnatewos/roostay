// packages/middleware/upload.js
// File upload middleware for Express using Multer
// Handles image uploads with file type validation and size limits
// Configured to work with Cloudinary for storage

const multer = require('multer');
const path = require('path');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    upload: {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxFilesPerRequest: 10,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],
    },
  };
}

/**
 * Creates and configures a Multer instance for memory storage.
 * Files are stored in memory buffers for direct upload to Cloudinary.
 * File type and size are validated before acceptance.
 *
 * @returns {Object} Configured Multer instance
 */
function createUploader() {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: {
      fileSize: config.upload.maxFileSize || 5 * 1024 * 1024,
      files: config.upload.maxFilesPerRequest || 10,
    },
    fileFilter: (req, file, callback) => {
      // Validate MIME type
      const allowedMimes = config.upload.allowedMimeTypes || [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
      ];

      if (!allowedMimes.includes(file.mimetype)) {
        const error = new ValidationError(
          `File type "${file.mimetype}" is not allowed. Accepted types: ${allowedMimes.join(', ')}`
        );
        return callback(error, false);
      }

      // Validate file extension
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExts = config.upload.allowedExtensions || ['.jpg', '.jpeg', '.png', '.webp'];

      if (!allowedExts.includes(ext)) {
        const error = new ValidationError(
          `File extension "${ext}" is not allowed. Accepted extensions: ${allowedExts.join(', ')}`
        );
        return callback(error, false);
      }

      callback(null, true);
    },
  });
}

const uploader = createUploader();

/**
 * Middleware for uploading a single image file.
 * Expects the file in the field named 'image'.
 *
 * Usage:
 *   router.post('/upload/avatar', authenticate, uploadSingle('image'), userController.uploadAvatar);
 *
 * @param {string} fieldName - The form field name for the file
 * @returns {Function} Express middleware function
 */
function uploadSingle(fieldName = 'image') {
  return (req, res, next) => {
    uploader.single(fieldName)(req, res, (err) => {
      if (err) {
        logger.warn('Single file upload failed', {
          fieldName,
          error: err.message,
          code: err.code,
        });

        if (err instanceof ValidationError) {
          return next(err);
        }

        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new ValidationError(
              `File size exceeds the maximum allowed size of ${(config.upload.maxFileSize / (1024 * 1024)).toFixed(1)}MB`
            )
          );
        }

        return next(new ValidationError('File upload failed: ' + err.message));
      }

      if (!req.file) {
        return next(new ValidationError('No file was uploaded'));
      }

      logger.debug('Single file uploaded successfully', {
        fieldName,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });

      next();
    });
  };
}

/**
 * Middleware for uploading multiple image files.
 * Expects files in the field named 'images'. Maximum 10 files.
 *
 * Usage:
 *   router.post('/listings/:id/images', authenticate, uploadMultiple('images', 10), listingController.uploadImages);
 *
 * @param {string} fieldName - The form field name for the files
 * @param {number} [maxCount=10] - Maximum number of files to accept
 * @returns {Function} Express middleware function
 */
function uploadMultiple(fieldName = 'images', maxCount = 10) {
  return (req, res, next) => {
    uploader.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        logger.warn('Multiple file upload failed', {
          fieldName,
          maxCount,
          error: err.message,
          code: err.code,
        });

        if (err instanceof ValidationError) {
          return next(err);
        }

        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new ValidationError(
              `File size exceeds the maximum allowed size of ${(config.upload.maxFileSize / (1024 * 1024)).toFixed(1)}MB`
            )
          );
        }

        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(
            new ValidationError(`Too many files. Maximum ${maxCount} files allowed per upload.`)
          );
        }

        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            new ValidationError(`Unexpected file field. Use the "${fieldName}" field for uploads.`)
          );
        }

        return next(new ValidationError('File upload failed: ' + err.message));
      }

      if (!req.files || req.files.length === 0) {
        return next(new ValidationError('No files were uploaded'));
      }

      logger.debug('Multiple files uploaded successfully', {
        fieldName,
        fileCount: req.files.length,
        totalSize: req.files.reduce((sum, f) => sum + f.size, 0),
      });

      next();
    });
  };
}

module.exports = {
  uploadSingle,
  uploadMultiple,
};