// packages/config/index.js
// Central configuration loader - loads and merges all config files
// Reads environment variables and resolves uppercase placeholder values
// Supports DATABASE_URL connection string pattern matching
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
    return config.map(item => resolveEnvVars(item));
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
};