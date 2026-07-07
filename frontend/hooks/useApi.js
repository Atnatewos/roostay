'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient, ApiError } from '@/lib/api';

export default function useApi(options = {}) {
  const { autoFetch = false, fetchFn } = options;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (apiCall) => {
    if (!apiCall || typeof apiCall !== 'function') return null;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall();
      if (mountedRef.current) { setData(response); setIsLoading(false); }
      return response;
    } catch (err) {
      if (mountedRef.current) {
        setError({
          message: err instanceof ApiError ? err.message : 'An unexpected error occurred.',
          status: err.status || 500,
        });
        setIsLoading(false);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoFetch && fetchFn) { execute(fetchFn); }
  }, []);

  const reset = useCallback(() => {
    setData(null); setIsLoading(false); setError(null);
  }, []);

  return { data, isLoading, error, execute, reset, setData };
}
