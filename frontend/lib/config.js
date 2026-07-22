// frontend/lib/config.js
// Frontend configuration loader — reads from the backend config system
// Provides feature flags, content strings, branding, and all configuration to React components
// All values are environment-aware (development, production, test)
// Domain is auto-detected — zero hardcoded URLs
// Author: Theron

import { getBaseUrl } from './url';

let cachedConfig = null;

/**
 * Fetches the full resolved configuration from the API.
 * Results are cached in memory to avoid redundant network requests.
 * The backend resolves environment-specific config and returns it.
 *
 * @returns {Promise<Object>} Resolved configuration object
 */
async function fetchConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const response = await fetch('/api/config', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Config fetch failed: ${response.status}`);
    }

    const data = await response.json();
    cachedConfig = data.data || data;
    return cachedConfig;
  } catch (error) {
    console.error('Failed to load configuration:', error.message);

    // Fallback to minimal defaults so the app doesn't crash
    return getFallbackConfig();
  }
}

/**
 * Provides minimal fallback configuration when the API is unavailable.
 * Ensures the app can still render basic UI even during outages.
 * Domain is auto-detected — never hardcoded.
 *
 * @returns {Object} Minimal fallback configuration
 */
function getFallbackConfig() {
  return {
    app: {
      name: process.env.NEXT_PUBLIC_APP_NAME || 'ROOSTAY',
      baseUrl: getBaseUrl(),
    },
    branding: {
      logos: {
        header: '/assets/logos/logo.svg',
        footer: '/assets/logos/logo-white.svg',
        favicon: '/assets/icons/favicon.ico',
        appleTouchIcon: '/assets/icons/apple-touch-icon.png',
        ogDefault: '/assets/images/og-default.jpg',
      },
      placeholders: {
        listing: '/assets/placeholders/placeholder-listing.svg',
        avatar: '/assets/placeholders/placeholder-avatar.svg',
        userAvatar: '/assets/placeholders/placeholder-user.svg',
      },
      colors: {
        primary: '#2563EB',
        primaryLight: '#DBEAFE',
        primaryDark: '#1D4ED8',
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontFamilyMono: 'JetBrains Mono, monospace',
        fontSizeBase: '16px',
      },
    },
    features: {},
    content: {
      errors: {
        generic: 'Something went wrong. Please try again.',
        networkError: 'Network error. Please check your connection.',
        unauthorized: 'Please log in to continue.',
      },
    },
    payment: {
      currency: 'ETB',
      currencySymbol: 'Br',
      serviceFee: { percent: 5, minAmount: 100, maxAmount: 5000 },
    },
    pricing: {
      currency: 'ETB',
      currencySymbol: 'Br',
      serviceFee: { percent: 5, minAmount: 100, maxAmount: 5000 },
    },
  };
}

/**
 * Checks if a feature flag is enabled.
 * Uses the cached config — call fetchConfig() first or use the hook.
 *
 * @param {Object} config      - The full config object
 * @param {string} featurePath - Dot-separated path to the feature flag
 * @returns {boolean} Whether the feature is enabled
 */
function isFeatureEnabled(config, featurePath) {
  const keys = featurePath.split('.');
  let value = config?.features;

  for (const key of keys) {
    if (value === null || value === undefined) return false;
    value = value[key];
  }

  return value === true;
}

/**
 * Retrieves a content string from the config.
 *
 * @param {Object} config       - The full config object
 * @param {string} contentPath  - Dot-separated path to the content string
 * @param {Object} [replacements] - Optional key-value pairs for string replacement
 * @returns {string} The content string, or the path itself as fallback
 */
function getContentString(config, contentPath, replacements = {}) {
  const keys = contentPath.split('.');
  let value = config?.content;

  for (const key of keys) {
    if (value === null || value === undefined) return contentPath;
    value = value[key];
  }

  if (typeof value !== 'string') return contentPath;

  let result = value;
  for (const [replaceKey, replaceValue] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`{{${replaceKey}}}`, 'g'), replaceValue);
  }

  return result;
}

export { fetchConfig, getFallbackConfig, isFeatureEnabled, getContentString };