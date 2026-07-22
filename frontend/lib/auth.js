// frontend/lib/auth.js
// Authentication helpers using httpOnly cookies for secure token storage
// No client-side token handling — the server is the single source of truth
// All URLs and messages come from constants (config-driven)
// Author: Theron

import { apiClient } from './api';
import constants from './constants';

/**
 * Authentication module for ROOSTAY.
 * Handles register, login, logout, and session retrieval.
 * All tokens are stored in httpOnly cookies managed by the server.
 */
const auth = {
  /**
   * Registers a new user account.
   * The server sets httpOnly cookies on success.
   *
   * @param {Object} userData - Registration form data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.firstName - First name
   * @param {string} userData.lastName - Last name
   * @param {string} [userData.phoneNumber] - Optional phone number
   * @returns {Promise<Object>} The created user object
   */
  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data.user;
  },

  /**
   * Logs in with email and password.
   * The server sets httpOnly cookies on success.
   *
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} The authenticated user object
   */
  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data.user;
  },

  /**
   * Logs out the current user.
   * Clears httpOnly cookies via the server and redirects to home.
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API failed, clearing local state anyway.', error);
    }

    if (typeof window !== 'undefined') {
      window.location.href = constants.ROUTES.HOME;
    }
  },

  /**
   * Retrieves the current authenticated user from the server.
   * Returns null if no valid session exists.
   *
   * @returns {Promise<Object|null>} The current user object, or null
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data.user;
    } catch {
      return null;
    }
  },

  /**
   * Checks if a user is currently authenticated.
   *
   * @returns {Promise<boolean>} True if the user is authenticated
   */
  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  },

  /**
   * Returns the role of a user object.
   *
   * @param {Object} user - User object with role property
   * @returns {string|null} The user's role, or null
   */
  getUserRole(user) {
    return user?.role || null;
  },

  /**
   * Redirects to the appropriate dashboard based on user role.
   * Uses the ROUTES map from constants for all URLs.
   *
   * @param {string} role - User role (guest, host, admin)
   */
  redirectToDashboard(role) {
    if (typeof window === 'undefined') return;

    const routeMap = {
      guest: constants.ROUTES.GUEST_DASHBOARD,
      host: constants.ROUTES.HOST_DASHBOARD,
      admin: constants.ROUTES.ADMIN_DASHBOARD,
    };

    window.location.href = routeMap[role] || constants.ROUTES.HOME;
  },
};

export default auth;