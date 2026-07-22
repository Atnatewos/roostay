// frontend/hooks/useConfig.js
// React hook for accessing configuration in client components
// Fetches config once on mount and provides feature flags and content strings
// Works alongside the existing useAuth hook for role-based feature toggling
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchConfig, isFeatureEnabled, getContentString } from '@/lib/config';

/**
 * Configuration hook providing feature flags, content strings, and app settings.
 * Fetches the resolved config from the API on component mount.
 * Results are cached across the application via the config module.
 *
 * @returns {Object} Config utilities and state
 * @returns {Object} config - The full resolved configuration object
 * @returns {boolean} isLoading - Whether the config is still being fetched
 * @returns {Function} t - Translation/content lookup function
 * @returns {Function} isEnabled - Feature flag check function
 * @returns {Object} app - App-level configuration (name, URLs, etc.)
 * @returns {Object} payment - Payment configuration
 * @returns {Object} pricing - Pricing configuration
 * @returns {Object} features - Feature flags
 */
export default function useConfig() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches configuration on mount.
   * Uses the cached config module to avoid redundant API calls.
   */
  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      try {
        const loadedConfig = await fetchConfig();

        if (isMounted) {
          setConfig(loadedConfig);
        }
      } catch (error) {
        console.error('useConfig: Failed to load configuration:', error.message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Content string lookup with replacements.
   * Shorthand for getContentString with the loaded config.
   *
   * @param {string} path - Dot-separated path to the content string
   * @param {Object} [replacements] - Optional key-value pairs for string replacement
   * @returns {string} The content string
   */
  const t = useCallback(
    (path, replacements = {}) => {
      if (!config) return path;
      return getContentString(config, path, replacements);
    },
    [config]
  );

  /**
   * Feature flag check.
   * Shorthand for isFeatureEnabled with the loaded config.
   *
   * @param {string} featurePath - Dot-separated path to the feature flag
   * @returns {boolean} Whether the feature is enabled
   */
  const isEnabled = useCallback(
    (featurePath) => {
      if (!config) return false;
      return isFeatureEnabled(config, featurePath);
    },
    [config]
  );

  return {
    config,
    isLoading,
    t,
    isEnabled,
    app: config?.app || {},
    payment: config?.payment || {},
    pricing: config?.pricing || {},
    features: config?.features || {},
    content: config?.content || {},
    navigation: config?.navigation || {},
  };
}