// packages/api/controllers/upload.controller.js
// Handles secure image uploads to Cloudinary
// Processes file buffers from Multer and returns cloud URLs and metadata
const { uploadToCloudinary } = require('../../utils/cloudinary');
const { asyncHandler } = require('../../utils/asyncHandler');
const { ValidationError } = require('../../utils/errors');
const logger = require('../../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = { cloudinary: { folder: 'roostay' } };
}

const uploadController = {
  /**
   * POST /api/upload
   * Uploads one or multiple images to Cloudinary.
   * Expects multipart/form-data with field name 'images'.
   * 
   * Body: FormData (images: File[], folder?: string)
   * Response: { success, message, data: { images: [{ url, publicId, width, height, format }] } }
   */
  uploadImages: asyncHandler(async (req, res) => {
    const files = req.files || [];
    
    if (files.length === 0) {
      throw new ValidationError('No files were provided for upload.');
    }

    // Optional folder override from request body, fallback to config
    const folder = req.body.folder || config.cloudinary.folder;
    const uploadedImages = [];

    // Process each file buffer and upload to Cloudinary
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, folder);
      
      uploadedImages.push({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      });
    }

    logger.info('Images uploaded successfully via API', {
      count: uploadedImages.length,
      folder,
      userId: req.user?.id || 'anonymous',
    });

    res.status(200).json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully.`,
      data: {
        images: uploadedImages,
      },
    });
  }),
};

module.exports = uploadController;