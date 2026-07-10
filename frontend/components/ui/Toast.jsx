// frontend/components/ui/Toast.jsx
// Toast notification component for user feedback
// Supports success, error, warning, and info variants
// Auto-dismisses after specified duration
'use client';

import { useEffect } from 'react';

/**
 * Toast Notification Component
 * Displays a temporary message with icon and auto-dismiss.
 * 
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {string} [props.type='info'] - Toast variant (success, error, warning, info)
 * @param {number} [props.duration=5000] - Auto-dismiss duration in milliseconds
 * @param {Function} props.onClose - Callback to close the toast
 */
export default function Toast({ message, type = 'info', duration = 5000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      bgColor: '#ECFDF5',
      borderColor: '#10B981',
      iconColor: '#10B981',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    error: {
      bgColor: '#FEF2F2',
      borderColor: '#EF4444',
      iconColor: '#EF4444',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
    warning: {
      bgColor: '#FFFBEB',
      borderColor: '#F59E0B',
      iconColor: '#F59E0B',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    info: {
      bgColor: '#EFF6FF',
      borderColor: '#3B82F6',
      iconColor: '#3B82F6',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
  };

  const currentConfig = config[type] || config.info;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        backgroundColor: currentConfig.bgColor,
        borderLeft: `4px solid ${currentConfig.borderColor}`,
        borderRadius: 'var(--radius-md, 8px)',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        minWidth: '300px',
        maxWidth: '400px',
        animation: 'toastSlideIn 0.3s ease-out',
      }}
    >
      <div style={{ color: currentConfig.iconColor, flexShrink: 0, marginTop: '2px' }}>
        {currentConfig.icon}
      </div>
      <p style={{
        margin: 0,
        fontSize: 'var(--font-size-sm, 14px)',
        fontWeight: 'var(--font-weight-medium, 500)',
        color: '#111827',
        lineHeight: '1.5',
        flex: 1,
      }}>
        {message}
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        style={{
          background: 'none',
          border: 'none',
          padding: '0',
          cursor: 'pointer',
          color: '#6B7280',
          flexShrink: 0,
          marginTop: '2px',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#111827'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280'; }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}