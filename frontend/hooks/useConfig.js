// frontend/hooks/useConfig.js
// React hook for accessing configuration in client components
// Fetches config once on mount and provides feature flags, content strings, and branding
// Supports instant language switching — UI updates immediately on language change
// Works alongside the existing useAuth hook for role-based feature toggling
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchConfig, isFeatureEnabled, getContentString } from '@/lib/config';
import { setLanguage, getCurrentLanguage } from '@/lib/i18n';

/**
 * Configuration hook providing feature flags, content strings, branding, and app settings.
 * Fetches the resolved config from the API on component mount.
 * Results are cached across the application via the config module.
 *
 * @returns {Object} Config utilities and state
 * @returns {Object} config          - The full resolved configuration object
 * @returns {boolean} isLoading      - Whether the config is still being fetched
 * @returns {Function} t             - Translation/content lookup function
 * @returns {Function} isEnabled     - Feature flag check function
 * @returns {Function} switchLanguage - Switch to a different language instantly
 * @returns {string} currentLanguage - Current language code
 * @returns {Object} app             - App-level configuration (name, URLs, etc.)
 * @returns {Object} branding        - Branding assets (logos, placeholders, colors, typography)
 * @returns {Object} payment         - Payment configuration
 * @returns {Object} pricing         - Pricing configuration
 * @returns {Object} features        - Feature flags
 * @returns {Object} content         - Content strings (translated)
 * @returns {Object} navigation      - Navigation structure
 * @returns {Object} language        - Language metadata (current, supported, default)
 */
export default function useConfig() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  /**
   * Fetches configuration on mount and when language changes.
   * Uses the cached config module to avoid redundant API calls.
   */
  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      if (isMounted) {
        setIsLoading(true);
      }

      try {
        const loadedConfig = await fetchConfig(currentLang);

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
  }, [currentLang]);

  /**
   * Switches the application to a different language instantly.
   * Persists the preference to localStorage and cookie, then fetches
   * the new translated config and updates all components immediately.
   *
   * @param {string} lang - ISO 639-1 language code (e.g., 'am')
   */
  const switchLanguage = useCallback(async (lang) => {
    // Don't do anything if it's the same language
    if (lang === currentLang) return;

    // Persist language preference immediately for responsiveness
    setLanguage(lang);

    // Update the language state — triggers useEffect to fetch new config
    setCurrentLang(lang);
  }, [currentLang]);

  /**
   * Content string lookup with replacements.
   * Returns the translated string or falls back to the path key.
   *
   * @param {string} path           - Dot-separated path to the content string
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
   * Returns false if config hasn't loaded yet.
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
    switchLanguage,
    currentLanguage: currentLang,
    app: config?.app || {},
    branding: config?.branding || {},
    payment: config?.payment || {},
    pricing: config?.pricing || {},
    features: config?.features || {},
    content: config?.content || {},
    navigation: config?.navigation || {},
    language: config?.language || { current: 'en', supported: [], default: 'en' },
  };
}