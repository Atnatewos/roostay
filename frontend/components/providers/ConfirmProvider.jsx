// frontend/components/providers/ConfirmProvider.jsx
// Global confirmation dialog provider
// Manages confirmation dialog state and renders the dialog
// Supports custom titles, messages, and button labels
'use client';

import { useState, useCallback } from 'react';
import ConfirmContext from '@/contexts/ConfirmContext';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

/**
 * Confirm Provider Component
 * Wraps the application and provides confirmation dialog functionality.
 * Uses a promise-based API for easy integration with async operations.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export default function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'danger',
    resolve: null,
  });

  /**
   * Shows a confirmation dialog and returns a promise.
   * The promise resolves to true if confirmed, false if cancelled.
   * 
   * @param {Object} options - Confirmation options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} [options.confirmLabel='Confirm'] - Confirm button label
   * @param {string} [options.cancelLabel='Cancel'] - Cancel button label
   * @param {string} [options.variant='danger'] - Button variant (danger, primary, warning)
   * @returns {Promise<boolean>} True if confirmed, false if cancelled
   * 
   * @example
   * const confirmed = await confirm({
   *   title: 'Delete Listing',
   *   message: 'Are you sure you want to delete this listing? This action cannot be undone.',
   *   confirmLabel: 'Delete',
   *   variant: 'danger'
   * });
   * if (confirmed) {
   *   // Delete the listing
   * }
   */
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Confirm',
        message: options.message || 'Are you sure?',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        variant: options.variant || 'danger',
        resolve,
      });
    });
  }, []);

  /**
   * Handles confirm button click.
   * Resolves the promise with true and closes the dialog.
   */
  const handleConfirm = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [confirmState.resolve]);

  /**
   * Handles cancel button click or overlay click.
   * Resolves the promise with false and closes the dialog.
   */
  const handleCancel = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [confirmState.resolve]);

  const contextValue = {
    confirm,
  };

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      
      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmState.isOpen}
        onClose={handleCancel}
        title={confirmState.title}
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Message */}
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
            {confirmState.message}
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              {confirmState.cancelLabel}
            </Button>
            <Button
              variant={confirmState.variant}
              onClick={handleConfirm}
            >
              {confirmState.confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}