// packages/api/routes/config.routes.js
// Configuration API route — serves resolved config to the frontend
// Provides feature flags, content strings, and all public configuration
// Filters out sensitive values (secrets, API keys) before sending to client
// Author: Theron

const express = require('express');
const router = express.Router();

// ============================================================================
// CONFIGURATION MODULES
// Only public-safe modules are exposed to the frontend
// Secrets like JWT secrets, API keys, and database URLs are NEVER sent
// ============================================================================

let config;
try {
  config = require('@roostay/config');
} catch {
  config = require('../../config');
}

/**
 * GET /api/config
 * Returns the full resolved configuration for the current environment.
 * Sensitive values (secrets, API keys, connection strings) are filtered out.
 * This endpoint is public — no authentication required.
 * The frontend uses this to get feature flags, content strings, and settings.
 */
router.get('/config', (req, res) => {
  // Build a public-safe config object by selecting only non-sensitive modules
  const publicConfig = {
    app: config.app || {},
    features: config.features || {},
    content: config.content || {},
    navigation: config.navigation || {},
    payment: {
      currency: config.payment?.currency || 'ETB',
      currencySymbol: config.payment?.currencySymbol || 'Br',
      serviceFeePercent: config.payment?.serviceFeePercent || 5,
      serviceFeeMin: config.payment?.serviceFeeMin || 100,
      serviceFeeMax: config.payment?.serviceFeeMax || 5000,
      paymentTimeoutMinutes: config.payment?.paymentTimeoutMinutes || 30,
      bankTransfer: {
        enabled: config.payment?.bankTransfer?.enabled || false,
        bankName: config.payment?.bankTransfer?.bankName || '',
        accountNumber: config.payment?.bankTransfer?.accountNumber || '',
        accountHolder: config.payment?.bankTransfer?.accountHolder || '',
        referencePrefix: config.payment?.bankTransfer?.referencePrefix || '',
        instructions: config.payment?.bankTransfer?.instructions || '',
      },
      telebirr: {
        enabled: config.payment?.telebirr?.enabled || false,
        shortcode: config.payment?.telebirr?.shortcode || '',
        merchantName: config.payment?.telebirr?.merchantName || '',
      },
    },
    pricing: config.pricing || {},
    booking: {
      messages: config.booking?.messages || {},
      bankTransfer: config.booking?.bankTransfer || {},
      telebirr: config.booking?.telebirr || {},
    },
    upload: {
      maxFileSize: config.upload?.maxFileSize || 5242880,
      allowedTypes: config.upload?.allowedTypes || ['image/jpeg', 'image/png', 'image/webp'],
    },
    cors: {
      origin: config.cors?.origin || '*',
    },
    environment: config.getEnvironment ? config.getEnvironment() : process.env.NODE_ENV || 'development',
  };

  res.status(200).json({
    success: true,
    data: publicConfig,
    meta: {
      environment: publicConfig.environment,
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;