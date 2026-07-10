// frontend/hooks/useToast.js
// Custom hook for accessing toast functionality
// Provides convenient methods to show different types of toasts
'use client';

import { useContext } from 'react';
import ToastContext from '@/contexts/ToastContext';

/**
 * useToast Hook
 * Returns toast methods for showing notifications.
 * 
 * @returns {Object} Toast methods
 * @returns {Function} showToast - Show a generic toast
 * @returns {Function} success - Show a success toast
 * @returns {Function} error - Show an error toast
 * @returns {Function} warning - Show a warning toast
 * @returns {Function} info - Show an info toast
 * @returns {Function} removeToast - Remove a specific toast
 * 
 * @example
 * const toast = useToast();
 * toast.success('Booking created!');
 * toast.error('Failed to save changes');
 */
export default function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}