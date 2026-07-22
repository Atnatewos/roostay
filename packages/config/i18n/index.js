// packages/config/i18n/index.js
// Internationalization loader for ROOSTAY
// Loads content from language-specific JSON files with English fallback
// Supports deep merging for partial translations
// Author: Theron

const path = require('path');

/**
 * Supported languages in ROOSTAY.
 * Add new languages here by adding the ISO 639-1 code.
 * The first language (en) is the default fallback.
 */
const SUPPORTED_LANGUAGES = ['en', 'am', 'om', 'ti', 'so'];
const DEFAULT_LANGUAGE = 'en';

/**
 * Language metadata — human-readable names for the language switcher.
 */
const LANGUAGE_NAMES = {
  en: 'English',
  am: 'አማርኛ',
  om: 'Afaan Oromoo',
  ti: 'ትግርኛ',
  so: 'Soomaali',
};

/**
 * Language flags — emoji flags for the language switcher UI.
 */
const LANGUAGE_FLAGS = {
  en: '🇬🇧',
  am: '🇪🇹',
  om: '🇪🇹',
  ti: '🇪🇹',
  so: '🇸🇴',
};

/**
 * Deep merges two objects.
 * Values from the override object take priority.
 * Nested objects are merged recursively.
 * Arrays are replaced (not concatenated).
 *
 * @param {Object} base     - The base object (English fallback)
 * @param {Object} override - The override object (translated content)
 * @returns {Object} Merged object
 */
function deepMerge(base, override) {
  const result = { ...base };

  for (const key of Object.keys(override)) {
    if (
      override[key] !== null &&
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      base[key] !== null &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(base[key], override[key]);
    } else {
      // Override primitive values and arrays
      result[key] = override[key];
    }
  }

  return result;
}

/**
 * Loads content for a specific language with English fallback.
 * If the requested language file doesn't exist, falls back to English.
 * Always merges with English so untranslated keys still show English text.
 *
 * @param {string} lang - ISO 639-1 language code (e.g., 'en', 'am')
 * @returns {Object} Content object with translations merged over English fallback
 */
function loadContent(lang) {
  // Validate language — fall back to English if unsupported
  const targetLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;

  // Load English as the base fallback
  let baseContent;
  try {
    baseContent = require(`./en.json`);
  } catch {
    console.error('i18n: Failed to load English fallback content.');
    baseContent = {};
  }

  // If requesting English, return it directly (no merge needed)
  if (targetLang === DEFAULT_LANGUAGE) {
    return baseContent;
  }

  // Load the requested translation
  let translatedContent;
  try {
    translatedContent = require(`./${targetLang}.json`);
  } catch {
    console.warn(`i18n: Translation file not found for "${targetLang}". Falling back to English.`);
    return baseContent;
  }

  // Deep merge: English base + translated overrides
  return deepMerge(baseContent, translatedContent);
}

/**
 * Detects the user's preferred language from multiple sources.
 * Priority: cookie → localStorage → browser Accept-Language → default
 *
 * @param {Object} [req] - Express request object (for server-side detection)
 * @returns {string} ISO 639-1 language code
 */
function detectLanguage(req) {
  // Server-side: check cookie first
  if (req && req.cookies && req.cookies.roostay_lang) {
    const cookieLang = req.cookies.roostay_lang;
    if (SUPPORTED_LANGUAGES.includes(cookieLang)) return cookieLang;
  }

  // Server-side: check Accept-Language header
  if (req && req.headers && req.headers['accept-language']) {
    const browserLang = req.headers['accept-language'].split(',')[0].split('-')[0];
    if (SUPPORTED_LANGUAGES.includes(browserLang)) return browserLang;
  }

  // Client-side: check localStorage (handled in frontend lib/i18n.js)
  // Fallback to default
  return DEFAULT_LANGUAGE;
}

/**
 * Returns the list of supported languages with metadata for the language switcher.
 *
 * @returns {Array} Array of { code, name, flag } objects
 */
function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.map((code) => ({
    code,
    name: LANGUAGE_NAMES[code] || code,
    flag: LANGUAGE_FLAGS[code] || '🌐',
  }));
}

module.exports = {
  loadContent,
  detectLanguage,
  getSupportedLanguages,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
};