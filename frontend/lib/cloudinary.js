// frontend/lib/cloudinary.js
// Cloudinary URL transformation utilities
// Optimizes image delivery by applying dynamic transformations via URL modifiers
// Reduces bandwidth and improves page load performance significantly

/**
 * Generates an optimized Cloudinary URL with specified transformations.
 * Safely handles non-Cloudinary URLs by returning them unmodified.
 * 
 * @param {string} url - The original image URL
 * @param {Object} options - Transformation options
 * @returns {string} The transformed Cloudinary URL
 */
export function getCloudinaryUrl(url, options = {}) {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  
  const transformations = [];
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);
  
  const transformString = transformations.length > 0 ? transformations.join(',') + '/' : '';
  
  return `${parts[0]}/upload/${transformString}${parts[1]}`;
}

/**
 * Returns a highly compressed, small thumbnail URL.
 * Ideal for listing grids and gallery thumbnails to save bandwidth.
 */
export function getThumbnailUrl(url) {
  return getCloudinaryUrl(url, { width: 400, height: 300, crop: 'fill', quality: 'auto', format: 'auto' });
}

/**
 * Returns a high-resolution, fully optimized URL.
 * Ideal for the main image in galleries and lightboxes.
 */
export function getHighResUrl(url) {
  return getCloudinaryUrl(url, { width: 1200, height: 800, crop: 'fill', quality: 'auto', format: 'auto' });
}