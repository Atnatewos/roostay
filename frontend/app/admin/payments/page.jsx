// frontend/app/admin/payments/page.jsx
// Admin Payments Page — verify or reject payment proofs submitted by guests
// Displays payment details, booking info, uploaded proof image, and action buttons
// Supports filtering by payment status and pagination
// Inherits admin layout from app/admin/layout.jsx — no Header/Footer needed
// All labels are config-driven via useConfig()
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import useConfig from '@/hooks/useConfig';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Admin Payments Page
 * Allows administrators to review and verify payment proofs
 * uploaded by guests for bank transfer payments.
 */
export default function AdminPaymentsPage() {
  const { content, payment } = useConfig();
  const adminContent = content?.admin || {};
  const paymentsContent = adminContent.payments || {};

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const [previewModal, setPreviewModal] = useState({ isOpen: false, imageUrl: '' });

  const currencySymbol = payment?.currencySymbol || constants.CURRENCY_SYMBOL;

  /**
   * Fetches paginated payments with optional status filter.
   *
   * @param {number} [page=1] - Page number
   */
  const fetchPayments = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (statusFilter) params.set('status', statusFilter);

      const response = await apiClient.get(`/admin/payments?${params.toString()}`);

      setPayments(response?.data || response?.payments || []);
      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) setError(paymentsContent.accessError || 'Admin access required.');
        else setError(err.message);
      } else {
        setError(paymentsContent.loadError || 'Failed to load payments.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, paymentsContent.accessError, paymentsContent.loadError]);

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  /**
   * Verifies or rejects a payment.
   *
   * @param {string} paymentId - Payment ID
   * @param {string} action    - 'verify' or 'reject'
   */
  async function handleAction(paymentId, action) {
    setProcessingId(paymentId);

    try {
      await apiClient.patch(`/admin/payments/${paymentId}/verify`, { action });

      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId ? { ...p, status: action === 'verify' ? 'completed' : 'failed' } : p
        )
      );
    } catch (err) {
      console.error(`Failed to ${action} payment:`, err.message);
    } finally {
      setProcessingId(null);
    }
  }

  function openPreview(imageUrl) {
    setPreviewModal({ isOpen: true, imageUrl });
  }

  function handlePageChange(page) {
    fetchPayments(page);
  }

  function getStatusBadge(status) {
    const map = { pending: 'warning', processing: 'info', completed: 'success', failed: 'danger', refunded: 'default', cancelled: 'default' };
    return map[status] || 'default';
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  const filters = [
    { value: 'pending', label: paymentsContent.pending || 'Pending' },
    { value: 'processing', label: paymentsContent.processing || 'Processing' },
    { value: 'completed', label: paymentsContent.completed || 'Completed' },
    { value: 'failed', label: paymentsContent.failed || 'Failed' },
  ];

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
          {paymentsContent.title || 'Payments'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {paymentsContent.subtitle || 'Verify payment proofs and manage transactions.'}
        </p>
      </div>

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

      {error && (
        <Card padding="lg" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error)' }}>{error}</p>
        </Card>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (<Skeleton key={i} type="rect" height="120px" />))}
        </div>
      ) : payments.length === 0 ? (
        <Card padding="lg">
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
            {paymentsContent.noResults || 'No'} {statusFilter} {paymentsContent.noResultsSuffix || 'payments found.'}
          </p>
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {payments.map((payment) => (
              <Card key={payment.id} padding="lg">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.25rem' }}>
                      {payment.listing_title || (paymentsContent.property || 'Property')}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {paymentsContent.guest || 'Guest'}: {payment.first_name} {payment.last_name} ({payment.email})
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                      {formatDate(payment.created_at)}
                    </p>
                    {payment.proof_notes && (
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        {paymentsContent.note || 'Note'}: {payment.proof_notes}
                      </p>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)', marginBottom: '0.5rem' }}>
                      {currencySymbol} {Number(payment.amount).toLocaleString()}
                    </p>
                    <Badge variant={getStatusBadge(payment.status)} size="sm">
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {payment.proof_image_url && (
                  <div style={{ marginBottom: '1rem' }}>
                    <img
                      src={payment.proof_image_url}
                      alt={paymentsContent.proofAlt || 'Payment proof'}
                      style={{ maxWidth: '200px', maxHeight: '120px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--color-border-light)' }}
                      onClick={() => openPreview(payment.proof_image_url)}
                    />
                    <button
                      onClick={() => openPreview(payment.proof_image_url)}
                      style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', marginTop: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {paymentsContent.clickToEnlarge || 'Click to enlarge'}
                    </button>
                  </div>
                )}

                {(payment.status === 'pending' || payment.status === 'processing') && (
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border-light)', paddingTop: '1rem' }}>
                    <Button variant="danger" size="sm" onClick={() => handleAction(payment.id, 'reject')} isLoading={processingId === payment.id}>
                      {paymentsContent.reject || 'Reject'}
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => handleAction(payment.id, 'verify')} isLoading={processingId === payment.id}>
                      {paymentsContent.verify || 'Verify'}
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

      <Modal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, imageUrl: '' })}
        title={paymentsContent.proofTitle || 'Payment Proof'}
        size="lg"
      >
        <div style={{ textAlign: 'center' }}>
          <img
            src={previewModal.imageUrl}
            alt={paymentsContent.proofEnlarged || 'Payment proof enlarged'}
            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-md)' }}
          />
        </div>
      </Modal>
    </div>
  );
}