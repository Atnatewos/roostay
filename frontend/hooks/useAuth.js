'use client';
import { useState, useEffect, useCallback } from 'react';
import auth from '@/lib/auth';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await auth.getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const result = await auth.login(email, password);
      setUser(result.user);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    setIsLoading(true);
    try {
      const result = await auth.register(userData);
      setUser(result.user);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    auth.logout();
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
