// frontend/lib/i18n.js
// Client-side internationalization utilities for ROOSTAY
// Detects user language from cookie → localStorage → browser → fallback
// Provides language switching and persistence
// Author: Theron

const STORAGE_KEY = 'roostay_lang';
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'am', 'om', 'ti', 'so'];

/**
 * Detects the user's preferred language on the client side.
 * Priority: localStorage → browser navigator.language → default
 *
 * @returns {string} ISO 639-1 language code
 */
function detectLanguage() {
  // Only runs in browser
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  // Check localStorage first (user explicitly selected a language)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage might be unavailable (private browsing)
  }

  // Check browser language
  if (navigator.language) {
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES.includes(browserLang)) {
      return browserLang;
    }
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Sets the user's language preference and persists it.
 * Saves to both localStorage (client-side) and cookie (server-side).
 *
 * @param {string} lang - ISO 639-1 language code
 */
function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;

  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Silently fail if localStorage is unavailable
  }

  // Persist to cookie for server-side detection
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${STORAGE_KEY}=${lang};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Returns the currently detected language.
 * Shortcut for detectLanguage() with a simpler name.
 *
 * @returns {string} ISO 639-1 language code
 */
function getCurrentLanguage() {
  return detectLanguage();
}

export { detectLanguage, setLanguage, getCurrentLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, STORAGE_KEY };