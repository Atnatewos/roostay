// frontend/app/admin/withdrawals/page.jsx
// Admin Withdrawals Page — process or reject host payout requests
// Displays withdrawal details, host bank information, and processing actions
// Supports search by host name/email, status filter, and pagination
// Includes transaction reference input on approval for record keeping
// Inherits admin layout from app/admin/layout.jsx — no Header/Footer needed
// All labels are config-driven via useConfig()
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import useConfig from '@/hooks/useConfig';
import { apiClient, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { getWithdrawalStatusBadge } from '@/lib/status';
import constants from '@/lib/constants';

/**
 * Admin Withdrawals Management Page
 * Allows administrators to process host withdrawal requests.
 * Displays withdrawal amount, fees, net amount, host details,
 * bank account information, and provides approve/reject actions
 * with optional transaction reference on approval.
 */
export default function AdminWithdrawalsPage() {
  const { content, payment } = useConfig();
  const adminContent = content?.admin || {};
  const withdrawalsContent = adminContent.withdrawals || {};

  const [withdrawals, setWithdrawals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Approval modal state
  const [approveModal, setApproveModal] = useState({ isOpen: false, withdrawalId: null, hostName: '' });
  const [transactionRef, setTransactionRef] = useState('');

  const currencySymbol = payment?.currencySymbol || constants.CURRENCY_SYMBOL;

  /**
   * Fetches paginated withdrawals with optional status filter and search query.
   *
   * @param {number} [page=1] - Page number
   */
  const fetchWithdrawals = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const response = await apiClient.get(`/admin/withdrawals?${params.toString()}`);

      setWithdrawals(response?.data || response?.withdrawals || []);
      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) setError(withdrawalsContent.accessError || 'Admin access required.');
        else setError(err.message);
      } else {
        setError(withdrawalsContent.loadError || 'Failed to load withdrawals.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, withdrawalsContent.accessError, withdrawalsContent.loadError]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchWithdrawals(1);
  }, [fetchWithdrawals]);

  /**
   * Handles search form submission.
   *
   * @param {Event} e - Form submit event
   */
  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchWithdrawals(1);
  }

  /**
   * Opens the approval modal to collect transaction reference.
   *
   * @param {string} withdrawalId - Withdrawal ID
   * @param {string} hostName     - Host name for display
   */
  function openApproveModal(withdrawalId, hostName) {
    setApproveModal({ isOpen: true, withdrawalId, hostName });
    setTransactionRef('');
  }

  /**
   * Approves a withdrawal with optional transaction reference.
   */
  async function handleApprove() {
    if (!approveModal.withdrawalId) return;

    setProcessingId(approveModal.withdrawalId);

    try {
      await apiClient.patch(`/admin/withdrawals/${approveModal.withdrawalId}/process`, {
        action: 'approve',
        transactionReference: transactionRef.trim() || null,
      });

      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === approveModal.withdrawalId ? { ...w, status: 'completed', transaction_reference: transactionRef.trim() || null } : w
        )
      );

      setApproveModal({ isOpen: false, withdrawalId: null, hostName: '' });
      setTransactionRef('');
    } catch (err) {
      console.error('Failed to approve withdrawal:', err.message);
    } finally {
      setProcessingId(null);
    }
  }

  /**
   * Rejects a withdrawal request.
   *
   * @param {string} withdrawalId - Withdrawal ID
   */
  async function handleReject(withdrawalId) {
    setProcessingId(withdrawalId);

    try {
      await apiClient.patch(`/admin/withdrawals/${withdrawalId}/process`, { action: 'reject' });

      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === withdrawalId ? { ...w, status: 'failed' } : w
        )
      );
    } catch (err) {
      console.error('Failed to reject withdrawal:', err.message);
    } finally {
      setProcessingId(null);
    }
  }

  /**
   * Handles page changes.
   *
   * @param {number} page - New page number
   */
  function handlePageChange(page) {
    fetchWithdrawals(page);
  }

  // Filter tabs configuration
  const filters = [
    { value: 'pending', label: withdrawalsContent.pending || 'Pending' },
    { value: 'completed', label: withdrawalsContent.completed || 'Completed' },
    { value: 'failed', label: withdrawalsContent.failed || 'Failed' },
  ];

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
          {withdrawalsContent.title || 'Withdrawals'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {withdrawalsContent.subtitle || 'Process host payout requests.'}
        </p>
      </div>

      {/* Search and Filter Bar */}
      <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <Input
              id="withdrawal-search"
              placeholder={withdrawalsContent.searchPlaceholder || 'Search by host name or email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" size="md">
            {withdrawalsContent.searchButton || 'Search'}
          </Button>
          {searchQuery && (
            <Button variant="ghost" size="md" onClick={() => { setSearchQuery(''); fetchWithdrawals(1); }}>
              {withdrawalsContent.clearSearch || 'Clear'}
            </Button>
          )}
        </form>
      </Card>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {filters.map((f) => (
          <button
            key={f.value}
            className={`btn btn--sm ${statusFilter === f.value ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <Card padding="lg" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error)' }}>{error}</p>
        </Card>
      )}

      {/* Withdrawals List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (<Skeleton key={i} type="rect" height="120px" />))}
        </div>
      ) : withdrawals.length === 0 ? (
        <Card padding="lg">
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
            {searchQuery
              ? (withdrawalsContent.noSearchResults || 'No withdrawals match your search.')
              : `${withdrawalsContent.noResults || 'No'} ${statusFilter} ${withdrawalsContent.noResultsSuffix || 'withdrawals found.'}`}
          </p>
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {withdrawals.map((withdrawal) => (
              <Card key={withdrawal.id} padding="lg">
                {/* Top Row: Info, Amount, Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  {/* Withdrawal Info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.25rem' }}>
                      {withdrawal.first_name} {withdrawal.last_name}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {withdrawal.email}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                      {withdrawalsContent.requested || 'Requested'} {formatDate(withdrawal.created_at)}
                    </p>
                    {/* Transaction Reference — shown for completed withdrawals */}
                    {withdrawal.transaction_reference && (
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', marginTop: '0.25rem', fontFamily: 'var(--font-family-mono)' }}>
                        {withdrawalsContent.transactionRef || 'Ref'}: {withdrawal.transaction_reference}
                      </p>
                    )}
                  </div>

                  {/* Amount Details */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '150px' }}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {withdrawalsContent.amount || 'Amount'}: {currencySymbol} {Number(withdrawal.amount).toLocaleString()}
                    </p>
                    {withdrawal.fee_amount > 0 && (
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                        {withdrawalsContent.fee || 'Fee'}: {currencySymbol} {Number(withdrawal.fee_amount).toLocaleString()}
                      </p>
                    )}
                    <p style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)', marginTop: '0.25rem' }}>
                      {withdrawalsContent.net || 'Net'}: {currencySymbol} {Number(withdrawal.net_amount).toLocaleString()}
                    </p>
                    <Badge variant={getWithdrawalStatusBadge(withdrawal.status)} size="sm" style={{ marginTop: '0.5rem' }}>
                      {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Bank Details */}
                {withdrawal.method === 'bank_transfer' && (
                  <div
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      marginBottom: '1rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '0.5rem',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--color-text-light)' }}>{withdrawalsContent.bank || 'Bank'}: </span>
                      <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{withdrawal.bank_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-light)' }}>{withdrawalsContent.account || 'Account'}: </span>
                      <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{withdrawal.account_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-light)' }}>{withdrawalsContent.holder || 'Holder'}: </span>
                      <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{withdrawal.account_holder || 'N/A'}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons for pending withdrawals */}
                {withdrawal.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border-light)', paddingTop: '1rem' }}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleReject(withdrawal.id)}
                      isLoading={processingId === withdrawal.id}
                    >
                      {withdrawalsContent.reject || 'Reject'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openApproveModal(withdrawal.id, `${withdrawal.first_name} ${withdrawal.last_name}`)}
                      isLoading={processingId === withdrawal.id}
                    >
                      {withdrawalsContent.approve || 'Approve'}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              showInfo
            />
          )}
        </>
      )}

      {/* Approval Modal with Transaction Reference */}
      <Modal
        isOpen={approveModal.isOpen}
        onClose={() => {
          setApproveModal({ isOpen: false, withdrawalId: null, hostName: '' });
          setTransactionRef('');
        }}
        title={withdrawalsContent.approveTitle || 'Approve Withdrawal'}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setApproveModal({ isOpen: false, withdrawalId: null, hostName: '' });
                setTransactionRef('');
              }}
            >
              {withdrawalsContent.cancel || 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              isLoading={processingId === approveModal.withdrawalId}
            >
              {withdrawalsContent.confirmApproval || 'Confirm Approval'}
            </Button>
          </div>
        }
      >
        <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
          {withdrawalsContent.approvingMessage || 'You are approving the withdrawal for:'}{' '}
          <strong>{approveModal.hostName}</strong>
        </p>
        <div>
          <label
            htmlFor="transaction-ref"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: '0.5rem',
            }}
          >
            {withdrawalsContent.transactionRefLabel || 'Transaction Reference (optional)'}
          </label>
          <Input
            id="transaction-ref"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder={withdrawalsContent.transactionRefPlaceholder || 'e.g., FT1234567890'}
            helperText={withdrawalsContent.transactionRefHelp || 'Enter the bank transfer reference number for record keeping.'}
          />
        </div>
      </Modal>
    </div>
  );
}