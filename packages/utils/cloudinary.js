// packages/utils/cloudinary.js
// Cloudinary integration utility for secure, scalable image uploads
// Handles configuration via environment variables and provides stream-based upload methods
const cloudinaryModule = require('cloudinary').v2;
const { ValidationError } = require('./errors');
const logger = require('./logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      folder: 'roostay',
      transformation: {
        width: 1200,
        height: 800,
        crop: 'fill',
        quality: 'auto',
      },
    },
  };
}

// Initialize Cloudinary with resolved configuration
cloudinaryModule.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Uploads a file buffer to Cloudinary using a stream.
 * Applies default transformations and folder structure from configuration.
 * 
 * @param {Buffer} fileBuffer - The file buffer from Multer memory storage
 * @param {string} [folder] - Optional specific folder override
 * @param {Object} [options] - Additional Cloudinary upload options
 * @returns {Promise<Object>} The Cloudinary upload result containing URLs and metadata
 * @throws {ValidationError} If the upload fails
 */
async function uploadToCloudinary(fileBuffer, folder, options = {}) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new ValidationError('Invalid file buffer provided for Cloudinary upload.');
  }

  const targetFolder = folder || config.cloudinary.folder || 'roostay';
  
  // Default transformations from config or fallback
  const transformation = config.cloudinary.transformation || {
    width: 1200,
    height: 800,
    crop: 'fill',
    quality: 'auto',
  };

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinaryModule.uploader.upload_stream(
      {
        folder: targetFolder,
        resource_type: 'image',
        transformation,
        ...options,
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload failed', { 
            error: error.message, 
            folder: targetFolder 
          });
          return reject(new ValidationError('Failed to upload image to cloud storage.'));
        }
        
        logger.debug('Cloudinary upload successful', {
          publicId: result.public_id,
          url: result.secure_url,
          folder: targetFolder,
        });
        
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Deletes an image from Cloudinary by its public ID.
 * 
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<Object>} The Cloudinary deletion result
 */
async function deleteFromCloudinary(publicId) {
  if (!publicId) {
    throw new ValidationError('Public ID is required to delete an image.');
  }

  return new Promise((resolve, reject) => {
    cloudinaryModule.uploader.destroy(publicId, (error, result) => {
      if (error) {
        logger.error('Cloudinary deletion failed', { 
          error: error.message, 
          publicId 
        });
        return reject(new ValidationError('Failed to delete image from cloud storage.'));
      }
      resolve(result);
    });
  });
}

module.exports = {
  cloudinary: cloudinaryModule,
  uploadToCloudinary,
  deleteFromCloudinary,
};