// frontend/app/host/withdrawals/page.jsx
// Host Withdrawals Page
// Displays withdrawal history and allows hosts to request new payouts
// Shows available balance, pending requests, and completed payouts
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Host Withdrawals Page
 * Allows hosts to manage their earnings by viewing withdrawal history
 * and submitting new withdrawal requests. Displays available balance
 * calculated from completed bookings minus pending and completed withdrawals.
 */
export default function HostWithdrawalsPage() {

  // Withdrawal history state
  const [withdrawals, setWithdrawals] = useState([]);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // New withdrawal request modal state
  const [requestModal, setRequestModal] = useState(false);

  // Withdrawal form state
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Computed balance — in production this would come from a dedicated API endpoint
  const [availableBalance, setAvailableBalance] = useState(0);

  /**
   * Fetches withdrawal history from the API.
   *
   * @param {number} [page=1] - Page number to fetch
   */
  const fetchWithdrawals = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/withdrawals?page=${page}&limit=10`);

      setWithdrawals(response?.data || response?.withdrawals || []);

      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Please log in to manage withdrawals.');
        } else if (err.status === 403) {
          setError('You need a host account to access this page.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load withdrawal data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch withdrawal data on component mount
  useEffect(() => {
    fetchWithdrawals(1);
  }, [fetchWithdrawals]);

  /**
   * Handles page changes from the Pagination component.
   *
   * @param {number} page - New page number
   */
  function handlePageChange(page) {
    fetchWithdrawals(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Updates a single field in the withdrawal request form.
   * Clears the field-specific error when the user starts typing.
   *
   * @param {string} field - Form field name
   * @param {string} value - New field value
   */
  function handleFormChange(field, value) {
    setWithdrawForm((prev) => ({ ...prev, [field]: value }));

    if (formErrors[field]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }

    // Clear success/error messages when user modifies the form
    if (submitSuccess) setSubmitSuccess(false);
    if (submitError) setSubmitError(null);
  }

  /**
   * Validates the withdrawal request form before submission.
   * Checks required fields, minimum amount, and numeric values.
   *
   * @returns {boolean} True if the form passes all validation checks
   */
  function validateWithdrawForm() {
    const errors = {};

    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) {
      errors.amount = 'Please enter a valid amount.';
    } else if (parseFloat(withdrawForm.amount) < 500) {
      errors.amount = 'Minimum withdrawal amount is 500 ETB.';
    }

    if (!withdrawForm.bankName.trim()) {
      errors.bankName = 'Bank name is required.';
    }

    if (!withdrawForm.accountNumber.trim()) {
      errors.accountNumber = 'Account number is required.';
    }

    if (!withdrawForm.accountHolder.trim()) {
      errors.accountHolder = 'Account holder name is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Submits the withdrawal request to the API.
   * Validates the form, sends the request, and handles the response.
   */
  async function handleSubmitWithdrawal() {
    if (!validateWithdrawForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await apiClient.post('/withdrawals', {
        amount: parseFloat(withdrawForm.amount),
        method: 'bank_transfer',
        bankName: withdrawForm.bankName.trim(),
        accountNumber: withdrawForm.accountNumber.trim(),
        accountHolder: withdrawForm.accountHolder.trim(),
      });

      setSubmitSuccess(true);

      // Reset form and close modal after a short delay
      setTimeout(() => {
        setRequestModal(false);
        setWithdrawForm({
          amount: '',
          bankName: '',
          accountNumber: '',
          accountHolder: '',
        });
        setSubmitSuccess(false);
        fetchWithdrawals(1);
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Failed to submit withdrawal request.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Returns badge variant for a withdrawal status.
   *
   * @param {string} status - Withdrawal status
   * @returns {string} CSS badge variant
   */
  function getStatusBadge(status) {
    const variantMap = {
      pending: 'warning',
      processing: 'info',
      completed: 'success',
      failed: 'danger',
      cancelled: 'default',
    };
    return variantMap[status] || 'default';
  }

  /**
   * Formats a date string for display.
   *
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '800px' }}>
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: '0.25rem',
              }}
            >
              Withdrawals
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Manage your earnings and request payouts.
            </p>
          </div>
          <Button variant="primary" onClick={() => setRequestModal(true)}>
            Request Withdrawal
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card
            padding="lg"
            style={{
              marginBottom: '1.5rem',
              borderLeft: '3px solid var(--color-error)',
            }}
          >
            <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchWithdrawals(1)}>
              Try Again
            </Button>
          </Card>
        )}

        {/* Withdrawals List */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} type="rect" height="80px" />
            ))}
          </div>
        ) : withdrawals.length === 0 ? (
          /* Empty State */
          <Card padding="lg">
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p
                style={{
                  fontSize: 'var(--font-size-lg)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '1.5rem',
                }}
              >
                No withdrawal requests yet. Earnings from completed bookings can be withdrawn here.
              </p>
              <Button variant="primary" onClick={() => setRequestModal(true)}>
                Request Your First Withdrawal
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Withdrawals History */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginBottom: '2rem',
              }}
            >
              {withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} padding="lg">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    {/* Withdrawal Details */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                          {constants.CURRENCY_SYMBOL} {Number(withdrawal.net_amount || withdrawal.amount).toLocaleString()}
                        </span>
                        <Badge variant={getStatusBadge(withdrawal.status)} size="sm">
                          {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                        </Badge>
                      </div>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        {withdrawal.bank_name} — {withdrawal.account_number}
                      </p>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                        Requested {formatDate(withdrawal.created_at)}
                      </p>
                    </div>

                    {/* Amount Breakdown */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {withdrawal.fee_amount > 0 && (
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                          Fee: {constants.CURRENCY_SYMBOL} {Number(withdrawal.fee_amount).toLocaleString()}
                        </p>
                      )}
                      {withdrawal.processed_at && (
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                          Processed {formatDate(withdrawal.processed_at)}
                        </p>
                      )}
                    </div>
                  </div>
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
      </main>

      {/* Request Withdrawal Modal */}
      <Modal
        isOpen={requestModal}
        onClose={() => {
          setRequestModal(false);
          setSubmitError(null);
          setSubmitSuccess(false);
        }}
        title="Request Withdrawal"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRequestModal(false);
                setSubmitError(null);
                setSubmitSuccess(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitWithdrawal}
              isLoading={isSubmitting}
            >
              Submit Request
            </Button>
          </div>
        }
      >
        {/* Success Message */}
        {submitSuccess && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-success-light)',
              color: '#065F46',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            Withdrawal request submitted successfully!
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-error-light)',
              color: 'var(--color-error)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {submitError}
          </div>
        )}

        {/* Withdrawal Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            id="amount"
            type="number"
            label={`Amount (${constants.CURRENCY_SYMBOL})`}
            value={withdrawForm.amount}
            onChange={(e) => handleFormChange('amount', e.target.value)}
            error={formErrors.amount}
            required
            placeholder="5000"
            helperText="Minimum withdrawal: 500 ETB"
          />

          <Input
            id="bankName"
            label="Bank Name"
            value={withdrawForm.bankName}
            onChange={(e) => handleFormChange('bankName', e.target.value)}
            error={formErrors.bankName}
            required
            placeholder="Commercial Bank of Ethiopia"
          />

          <Input
            id="accountNumber"
            label="Account Number"
            value={withdrawForm.accountNumber}
            onChange={(e) => handleFormChange('accountNumber', e.target.value)}
            error={formErrors.accountNumber}
            required
            placeholder="1000000000000"
          />

          <Input
            id="accountHolder"
            label="Account Holder Name"
            value={withdrawForm.accountHolder}
            onChange={(e) => handleFormChange('accountHolder', e.target.value)}
            error={formErrors.accountHolder}
            required
            placeholder="Your full name as it appears on the account"
          />
        </div>
      </Modal>

      <Footer />
    </>
  );
}