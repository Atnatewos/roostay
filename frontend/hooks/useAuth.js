// frontend/hooks/useAuth.js
// React hook for managing authentication state
// Relies entirely on server-side httpOnly cookies via /auth/me endpoint
// No client-side token or user caching — the server is the single source of truth
// Author: Theron
'use client';

import { useState, useEffect, useCallback } from 'react';
import auth from '@/lib/auth';

/**
 * Authentication hook providing user state and auth actions.
 * Fetches the current user from the server on mount via /auth/me.
 * If the request fails (no valid cookie), the user is considered unauthenticated.
 * 
 * @returns {Object} Auth state and actions
 * @returns {Object|null} user - The current user object or null
 * @returns {boolean} isLoading - Whether the initial auth check is in progress
 * @returns {boolean} isAuthenticated - Whether a user is currently authenticated
 * @returns {boolean} isGuest - Whether the user has the 'guest' role
 * @returns {boolean} isHost - Whether the user has the 'host' role
 * @returns {boolean} isAdmin - Whether the user has the 'admin' role
 * @returns {Function} login - Login with email and password
 * @returns {Function} register - Register a new account
 * @returns {Function} logout - Log out and clear session
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches the current user from the server on mount.
   * If /auth/me returns 401 (no valid cookie), user is set to null.
   */
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const currentUser = await auth.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Logs in with email and password.
   * Updates user state on success.
   * 
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} The authenticated user object
   */
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const loggedInUser = await auth.login(email, password);
      // auth.login() returns the user object directly, not { user: ... }
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Registers a new user account.
   * Updates user state on success.
   * 
   * @param {Object} userData - Registration data
   * @returns {Promise<Object>} The created user object
   */
  const register = useCallback(async (userData) => {
    setIsLoading(true);
    try {
      const registeredUser = await auth.register(userData);
      // auth.register() returns the user object directly, not { user: ... }
      setUser(registeredUser);
      return registeredUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logs out the current user.
   * Clears user state and calls the server-side logout endpoint.
   */
  const logout = useCallback(async () => {
    setUser(null);
    await auth.logout();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isGuest: user?.role === 'guest',
    isHost: user?.role === 'host',
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
  };
}