// frontend/components/providers/ToastProvider.jsx
// Toast notification provider and context
// Manages a queue of toast notifications with auto-dismiss
// Uses default export for compatibility with Next.js layout imports
'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '@/components/ui/Toast';

const ToastContext = createContext(null);

/**
 * Toast Provider Component
 * Wraps the application to provide toast notification functionality.
 * Manages a stack of toasts and renders them in a fixed position.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap
 */
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  /**
   * Adds a new toast to the queue.
   * 
   * @param {string} message - The message to display
   * @param {string} [type='info'] - Toast variant (success, error, warning, info)
   * @param {number} [duration=5000] - Auto-dismiss duration in milliseconds
   * @returns {number} The unique ID of the created toast
   */
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  /**
   * Removes a toast from the queue by ID.
   * 
   * @param {number} id - The toast ID to remove
   */
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Convenience methods for each toast variant.
   * These are exposed via the context to child components.
   */
  const showToast = {
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '400px',
        }}
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast notifications.
 * Must be used within a ToastProvider.
 * 
 * @returns {Object} Toast methods (success, error, warning, info)
 * @throws {Error} If used outside a ToastProvider
 * 
 * @example
 * const toast = useToast();
 * toast.success('Operation completed!');
 * toast.error('Something went wrong.');
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}