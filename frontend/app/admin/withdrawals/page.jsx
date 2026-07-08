// frontend/app/admin/withdrawals/page.jsx
// Admin Withdrawals Page — process or reject host payout requests
// Displays withdrawal details, host bank information, and processing actions
// Supports filtering by status and pagination
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Admin Withdrawals Management Page
 * Allows administrators to process host withdrawal requests.
 * Displays withdrawal amount, fees, net amount, host details,
 * and bank account information for processing payments.
 */
export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  /**
   * Fetches paginated withdrawals with optional status filter.
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

      const response = await apiClient.get(`/admin/withdrawals?${params.toString()}`);

      setWithdrawals(response?.data || response?.withdrawals || []);
      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) setError('Admin access required.');
        else setError(err.message);
      } else {
        setError('Failed to load withdrawals.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  // Fetch on mount and when filter changes
  useEffect(() => {
    fetchWithdrawals(1);
  }, [fetchWithdrawals]);

  /**
   * Approves or rejects a withdrawal request.
   *
   * @param {string} withdrawalId - Withdrawal ID
   * @param {string} action - 'approve' or 'reject'
   */
  async function handleProcess(withdrawalId, action) {
    setProcessingId(withdrawalId);

    try {
      await apiClient.patch(`/admin/withdrawals/${withdrawalId}/process`, { action });

      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === withdrawalId ? { ...w, status: action === 'approve' ? 'completed' : 'failed' } : w
        )
      );
    } catch (err) {
      console.error(`Failed to ${action} withdrawal:`, err.message);
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

  /**
   * Returns badge variant for withdrawal status.
   *
   * @param {string} status - Withdrawal status
   * @returns {string} Badge variant
   */
  function getStatusBadge(status) {
    const map = { pending: 'warning', processing: 'info', completed: 'success', failed: 'danger', cancelled: 'default' };
    return map[status] || 'default';
  }

  /**
   * Formats a date for display.
   *
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  // Filter tabs
  const filters = [
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
            Withdrawals
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Process host payout requests.
          </p>
        </div>

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

        {/* Error */}
        {error && (
          <Card padding="lg" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--color-error)' }}>
            <p style={{ color: 'var(--color-error)' }}>{error}</p>
          </Card>
        )}

        {/* Withdrawals List */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (<Skeleton key={i} type="rect" height="100px" />))}
          </div>
        ) : withdrawals.length === 0 ? (
          <Card padding="lg">
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
              No {statusFilter} withdrawals found.
            </p>
          </Card>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} padding="lg">
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
                        Requested {formatDate(withdrawal.created_at)}
                      </p>
                    </div>

                    {/* Amount Details */}
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '150px' }}>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        Amount: {constants.CURRENCY_SYMBOL} {Number(withdrawal.amount).toLocaleString()}
                      </p>
                      {withdrawal.fee_amount > 0 && (
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                          Fee: {constants.CURRENCY_SYMBOL} {Number(withdrawal.fee_amount).toLocaleString()}
                        </p>
                      )}
                      <p style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)', marginTop: '0.25rem' }}>
                        Net: {constants.CURRENCY_SYMBOL} {Number(withdrawal.net_amount).toLocaleString()}
                      </p>
                      <Badge variant={getStatusBadge(withdrawal.status)} size="sm" style={{ marginTop: '0.5rem' }}>
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
                        <span style={{ color: 'var(--color-text-light)' }}>Bank: </span>
                        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{withdrawal.bank_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-light)' }}>Account: </span>
                        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{withdrawal.account_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-light)' }}>Holder: </span>
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
                        onClick={() => handleProcess(withdrawal.id, 'reject')}
                        isLoading={processingId === withdrawal.id}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleProcess(withdrawal.id, 'approve')}
                        isLoading={processingId === withdrawal.id}
                      >
                        Approve
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} showInfo />
            )}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}