// frontend/hooks/useConfirm.js
// Custom hook for accessing confirmation dialog functionality
// Provides a promise-based confirm method
'use client';

import { useContext } from 'react';
import ConfirmContext from '@/contexts/ConfirmContext';

/**
 * useConfirm Hook
 * Returns the confirm method for showing confirmation dialogs.
 * 
 * @returns {Object} Confirm methods
 * @returns {Function} confirm - Show a confirmation dialog
 * 
 * @example
 * const { confirm } = useConfirm();
 * const confirmed = await confirm({
 *   title: 'Delete Listing',
 *   message: 'Are you sure?',
 *   confirmLabel: 'Delete',
 *   variant: 'danger'
 * });
 */
export default function useConfirm() {
  const context = useContext(ConfirmContext);
  
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  
  return context;
}