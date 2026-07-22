// packages/config/index.js
// Central configuration loader — loads and merges all config files
// Reads environment variables and resolves uppercase placeholder values
// Supports DATABASE_URL connection string pattern matching
// Provides feature flag evaluation and content string lookup utilities
// Author: Theron

const path = require('path');

/**
 * Resolves environment variable placeholders in config objects.
 * Config values that match UPPER_CASE patterns (like "DB_HOST", "DATABASE_URL")
 * are replaced with their actual environment variable values.
 * Falls back to the original value if env var is not set.
 *
 * @param {Object} config - The configuration object to resolve
 * @returns {Object} Configuration with environment variables resolved
 */
function resolveEnvVars(config) {
  // Direct string match for env var placeholders
  if (typeof config === 'string') {
    const upperPattern = /^[A-Z_][A-Z0-9_]*$/;
    if (upperPattern.test(config) && process.env[config] !== undefined) {
      return process.env[config];
    }
    return config;
  }

  if (Array.isArray(config)) {
    return config.map((item) => resolveEnvVars(item));
  }

  if (config !== null && typeof config === 'object') {
    const resolved = {};
    for (const [key, value] of Object.entries(config)) {
      resolved[key] = resolveEnvVars(value);
    }
    return resolved;
  }

  return config;
}

/**
 * Loads a JSON configuration file for the current environment.
 * Config files support environment-specific sections (development, production, test).
 * Falls back to the entire config object if no environment key matches.
 *
 * @param {string} filename - The config filename (e.g., 'app.config.json')
 * @returns {Object} Resolved configuration for the current environment
 */
function loadConfig(filename) {
  const config = require(`./${filename}`);
  const env = process.env.NODE_ENV || 'development';
  const envConfig = config[env] || config;
  return resolveEnvVars(envConfig);
}

/**
 * Returns the current environment name.
 *
 * @returns {string} Current environment (development, production, test)
 */
function getEnvironment() {
  return process.env.NODE_ENV || 'development';
}

// ============================================================================
// LOAD ALL CONFIGURATION MODULES
// Each module maps to a specific domain of the application
// ============================================================================
const app = loadConfig('app.config.json');
const database = loadConfig('database.config.json');
const auth = loadConfig('auth.config.json');
const cloudinary = loadConfig('cloudinary.config.json');
const payment = loadConfig('payment.config.json');
const cors = loadConfig('cors.config.json');
const rateLimit = loadConfig('rateLimit.config.json');
const upload = loadConfig('upload.config.json');
const features = loadConfig('features.config.json');
const booking = loadConfig('booking.config.json');
const content = loadConfig('content.config.json');
const navigation = loadConfig('navigation.config.json');
const pricing = loadConfig('pricing.config.json');
const branding = loadConfig('branding.config.json');

// ============================================================================
// FEATURE FLAG UTILITY
// Checks if a feature is enabled by its path (e.g., "messagingEnabled")
// ============================================================================

/**
 * Checks if a feature flag is enabled in the current environment.
 * Features can be toggled ON/OFF per environment via features.config.json.
 *
 * Usage:
 *   isEnabled('messagingEnabled')       // true/false
 *   isEnabled('ui.socialLinks.facebook') // checks nested paths
 *
 * @param {string} featurePath - Dot-separated path to the feature flag
 * @returns {boolean} Whether the feature is enabled
 */
function isEnabled(featurePath) {
  const keys = featurePath.split('.');
  let value = features;

  for (const key of keys) {
    if (value === null || value === undefined) return false;
    value = value[key];
  }

  return value === true;
}

// ============================================================================
// CONTENT STRING LOOKUP
// Retrieves user-facing strings from content.config.json
// ============================================================================

/**
 * Retrieves a content string by its dot-separated path.
 * Falls back to the key name if the string is not found.
 *
 * Usage:
 *   getContent('booking.messages.bookingCreated')  // "Booking Created Successfully!"
 *   getContent('errors.unauthorized')               // "Please log in to continue."
 *
 * @param {string} contentPath      - Dot-separated path to the content string
 * @param {Object} [replacements]   - Optional key-value pairs to replace in the string
 * @returns {string} The content string with replacements applied
 */
function getContent(contentPath, replacements = {}) {
  const keys = contentPath.split('.');
  let value = content;

  for (const key of keys) {
    if (value === null || value === undefined) return contentPath;
    value = value[key];
  }

  if (typeof value !== 'string') return contentPath;

  // Apply any string replacements (e.g., {{appName}} → "ROOSTAY")
  let result = value;
  for (const [replaceKey, replaceValue] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`{{${replaceKey}}}`, 'g'), replaceValue);
  }

  return result;
}

/**
 * Retrieves a nested object of content strings by its dot-separated path.
 * Useful for getting a group of related strings (e.g., all booking messages).
 *
 * Usage:
 *   getContentGroup('booking.messages')  // Returns the entire messages object
 *
 * @param {string} groupPath - Dot-separated path to the content group
 * @returns {Object} The content group object, or empty object if not found
 */
function getContentGroup(groupPath) {
  const keys = groupPath.split('.');
  let value = content;

  for (const key of keys) {
    if (value === null || value === undefined) return {};
    value = value[key];
  }

  return typeof value === 'object' && !Array.isArray(value) ? value : {};
}

// ============================================================================
// BRANDING ASSET LOOKUP
// Retrieves logo paths, placeholder images, colors, and typography
// ============================================================================

/**
 * Retrieves a branding asset path by its dot-separated key.
 *
 * Usage:
 *   getBranding('logos.header')           // "/images/logo.svg"
 *   getBranding('placeholders.listing')   // "/images/placeholder-listing.svg"
 *   getBranding('colors.primary')         // "#2563EB"
 *
 * @param {string} assetPath - Dot-separated path to the branding asset
 * @returns {string} The asset value, or the path itself as fallback
 */
function getBranding(assetPath) {
  const keys = assetPath.split('.');
  let value = branding;

  for (const key of keys) {
    if (value === null || value === undefined) return assetPath;
    value = value[key];
  }

  return value;
}

module.exports = {
  app,
  database,
  auth,
  cloudinary,
  payment,
  cors,
  rateLimit,
  upload,
  features,
  booking,
  content,
  navigation,
  pricing,
  branding,
  getEnvironment,
  isEnabled,
  getContent,
  getContentGroup,
  getBranding,
};