// frontend/components/booking/BookingPaymentModal.jsx
// Payment-first booking modal with countdown timer starting immediately
// Displays bank/Telebirr details FIRST, then collects transaction number
// Validates transaction uniqueness before final booking submission
// All user-facing strings are driven by the config system via useConfig()
// Telebirr option is gated behind the "telebirr.enabled" feature flag
// Author: Theron

'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CountdownTimer from '@/components/ui/CountdownTimer';
import PriceBreakdown from '@/components/booking/PriceBreakdown';
import useConfig from '@/hooks/useConfig';
import { apiClient, ApiError } from '@/lib/api';

/**
 * Booking Payment Modal
 *
 * CORRECT FLOW:
 * 1. Modal opens → Countdown timer STARTS immediately (configurable timeout)
 * 2. Guest sees payment instructions (bank account or Telebirr details)
 * 3. Guest goes to bank app, sends money, receives SMS with transaction number
 * 4. Guest enters transaction number in modal
 * 5. Guest clicks "Verify" → system checks if number is unique
 * 6. If valid, guest clicks "Submit & Book" → booking + payment created atomically
 * 7. Success state shows congratulations and booking reference
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen            - Whether the modal is visible
 * @param {Function} props.onClose           - Callback to close the modal
 * @param {Object}   props.listing           - Full listing data object
 * @param {Object}   props.bookingData       - Booking details
 * @param {Object}   props.pricing           - Calculated pricing breakdown
 * @param {Function} props.onBookingComplete - Callback after successful booking creation
 */
export default function BookingPaymentModal({
  isOpen,
  onClose,
  listing,
  bookingData,
  pricing,
  onBookingComplete,
}) {
  // =========================================================================
  // CONFIG — All payment config, messages, and feature flags
  // =========================================================================
  const { payment, booking, pricing: pricingConfig, isEnabled } = useConfig();

  // Derive messages from config, falling back to booking config if needed
  const messages = booking?.messages || {};
  const bankTransferConfig = payment?.bankTransfer || {};
  const telebirrConfig = payment?.telebirr || {};

  // Feature flag: is Telebirr enabled?
  const telebirrEnabled = isEnabled('telebirr.enabled');

  // Payment timeout from config
  const paymentTimeoutMinutes =
    payment?.paymentTimeoutMinutes ||
    pricingConfig?.payment?.paymentTimeoutMinutes ||
    30;

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [isValidatingTransaction, setIsValidatingTransaction] = useState(false);
  const [transactionError, setTransactionError] = useState(null);
  const [isTransactionValid, setIsTransactionValid] = useState(false);
  const [proofNotes, setProofNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [paymentExpiresAt, setPaymentExpiresAt] = useState(null);

  /**
   * Resets all form state and starts the countdown timer when modal opens.
   * The timer duration is driven by config.
   */
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('bank_transfer');
      setTransactionNumber('');
      setTransactionError(null);
      setIsTransactionValid(false);
      setProofNotes('');
      setSubmitError(null);
      setBookingResult(null);
      setIsSubmitting(false);

      const expiryTime = new Date(
        Date.now() + paymentTimeoutMinutes * 60 * 1000
      );
      setPaymentExpiresAt(expiryTime);
    } else {
      setPaymentExpiresAt(null);
    }
  }, [isOpen, paymentTimeoutMinutes]);

  /**
   * Handles payment method selection.
   * Resets transaction validation when switching methods.
   *
   * @param {string} method - The selected payment method
   */
  function handleMethodChange(method) {
    setPaymentMethod(method);
    setTransactionError(null);
    setIsTransactionValid(false);
  }

  /**
   * Handles transaction number input changes.
   * Clears previous validation state when the user edits the number.
   *
   * @param {Event} e - Input change event
   */
  function handleTransactionChange(e) {
    setTransactionNumber(e.target.value);
    setTransactionError(null);
    setIsTransactionValid(false);
  }

  /**
   * Validates the transaction number against the API.
   * Checks if the number has already been used in a completed payment.
   */
  async function handleValidateTransaction() {
    if (!transactionNumber || transactionNumber.trim().length < 3) {
      setTransactionError(
        messages.transactionRequired || 'Please enter a valid transaction reference number.'
      );
      setIsTransactionValid(false);
      return;
    }

    setIsValidatingTransaction(true);
    setTransactionError(null);

    try {
      const response = await apiClient.post('/payments/validate-transaction', {
        transactionNumber: transactionNumber.trim(),
      });

      if (response?.data?.valid) {
        setIsTransactionValid(true);
        setTransactionError(null);
      } else {
        setIsTransactionValid(false);
        setTransactionError(
          response?.data?.message ||
            messages.transactionInvalid ||
            'This transaction number has already been used.'
        );
      }
    } catch (err) {
      setIsTransactionValid(false);
      if (err instanceof ApiError) {
        setTransactionError(err.message);
      } else {
        setTransactionError(
          messages.validationFailed || 'Failed to validate transaction number. Please try again.'
        );
      }
    } finally {
      setIsValidatingTransaction(false);
    }
  }

  /**
   * Submits the booking with payment information to the API.
   * Creates the booking and payment record in a single atomic operation.
   */
  async function handleSubmitBooking() {
    if (!transactionNumber || transactionNumber.trim().length < 3) {
      setTransactionError(
        messages.transactionRequired || 'Please enter a valid transaction reference number.'
      );
      return;
    }

    if (!isTransactionValid) {
      setTransactionError(
        messages.transactionMustVerify || 'Please verify your transaction number before submitting.'
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await apiClient.post('/bookings', {
        listingId: listing.id,
        checkInDate: bookingData.checkInDate,
        checkOutDate: bookingData.checkOutDate,
        guestCount: bookingData.guestCount,
        bookingType: bookingData.bookingType || 'short_term',
        specialRequests: bookingData.specialRequests || null,
        paymentMethod: paymentMethod,
        transactionNumber: transactionNumber.trim(),
        proofNotes: proofNotes || null,
      });

      setBookingResult(response.data);

      if (onBookingComplete) {
        onBookingComplete(response.data);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError(
          messages.bookingFailed || 'Failed to create booking. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Copies text to the clipboard with fallback for older browsers.
   *
   * @param {string} text  - Text to copy
   * @param {string} field - Field identifier for feedback
   */
  async function copyToClipboard(text, field) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }

  /**
   * Handles the countdown expiry.
   */
  function handleCountdownExpire() {
    if (!bookingResult) {
      setSubmitError(
        messages.paymentExpired || 'Payment window has expired. Please close this modal and try again.'
      );
    }
  }

  // Currency symbol from config
  const currencySymbol = payment?.currencySymbol || 'Br';

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        bookingResult
          ? messages.bookingCreated || 'Booking Created Successfully!'
          : 'Complete Your Booking'
      }
      size="md"
      closeOnOverlay={!isSubmitting}
    >
      {/* =====================================================================
          SUCCESS STATE
          ===================================================================== */}
      {bookingResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              padding: '2rem 1.25rem',
              backgroundColor: 'var(--color-success-light)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✓</div>
            <p
              style={{
                fontWeight: 'var(--font-weight-bold)',
                fontSize: 'var(--font-size-lg)',
                color: '#065F46',
                marginBottom: '0.5rem',
              }}
            >
              {messages.bookingCreated || 'Booking Created Successfully!'}
            </p>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: '#065F46',
                lineHeight: '1.6',
                maxWidth: '320px',
                margin: '0 auto',
              }}
            >
              {messages.bookingAwaitingConfirmation ||
                'Your booking has been submitted and is awaiting confirmation.'}
            </p>
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {messages.bookingReferenceLabel || 'Booking Reference'}
            </p>
            <p
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)',
                fontFamily: 'var(--font-family-mono)',
                color: 'var(--color-text-primary)',
              }}
            >
              #{bookingResult.booking?.id?.substring(0, 8).toUpperCase()}
            </p>
          </div>

          <Button variant="primary" fullWidth onClick={onClose}>
            {messages.viewMyBookings || 'View My Bookings'}
          </Button>
        </div>
      ) : (
        /* ===================================================================
            FORM STATE
            =================================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Countdown Timer */}
          {paymentExpiresAt && (
            <div>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '0.5rem',
                }}
              >
                {messages.completePaymentWithin || 'Complete your payment within:'}
              </p>
              <CountdownTimer
                expiresAt={paymentExpiresAt}
                onExpire={handleCountdownExpire}
                size="md"
              />
            </div>
          )}

          {/* Pricing Summary */}
          {pricing && (
            <PriceBreakdown
              pricing={pricing}
              bookingType={bookingData?.bookingType || 'short_term'}
              compact
            />
          )}

          {/* Payment Method Selection — Telebirr gated by feature flag */}
          <div>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: '0.75rem',
              }}
            >
              {messages.selectPaymentMethod || 'Select Payment Method'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {/* Bank Transfer — always available */}
              <button
                type="button"
                onClick={() => handleMethodChange('bank_transfer')}
                style={{
                  flex: telebirrEnabled ? 1 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  border: '2px solid',
                  borderColor:
                    paymentMethod === 'bank_transfer'
                      ? 'var(--color-primary)'
                      : 'var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  backgroundColor:
                    paymentMethod === 'bank_transfer'
                      ? 'var(--color-primary-light)'
                      : 'transparent',
                }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                  {messages.bankTransfer || 'Bank Transfer'}
                </span>
              </button>

              {/* Telebirr — only shown when feature flag is enabled */}
              {telebirrEnabled && (
                <button
                  type="button"
                  onClick={() => handleMethodChange('telebirr')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    border: '2px solid',
                    borderColor:
                      paymentMethod === 'telebirr'
                        ? 'var(--color-primary)'
                        : 'var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    backgroundColor:
                      paymentMethod === 'telebirr'
                        ? 'var(--color-primary-light)'
                        : 'transparent',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    {messages.telebirr || 'Telebirr'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {paymentMethod === 'bank_transfer' ? (
              <>
                <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.75rem' }}>
                  {messages.bankTransferDetails || 'Bank Transfer Details'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {messages.bankLabel || 'Bank'}
                    </span>
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                      {bankTransferConfig.bankName || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {messages.accountNumberLabel || 'Account Number'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 'var(--font-weight-medium)', fontFamily: 'var(--font-family-mono)' }}>
                        {bankTransferConfig.accountNumber || 'N/A'}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(bankTransferConfig.accountNumber, 'account')}
                        style={{
                          padding: '2px 6px',
                          fontSize: 'var(--font-size-xs)',
                          color: copiedField === 'account' ? 'var(--color-success)' : 'var(--color-primary)',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          fontWeight: 'var(--font-weight-medium)',
                        }}
                      >
                        {copiedField === 'account' ? (messages.copied || 'Copied!') : (messages.copy || 'Copy')}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {messages.accountHolderLabel || 'Account Holder'}
                    </span>
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                      {bankTransferConfig.accountHolder || 'N/A'}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid var(--color-border-light)',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {messages.amountToTransfer || 'Amount to Transfer'}
                    </span>
                    <span
                      style={{
                        fontWeight: 'var(--font-weight-bold)',
                        fontSize: 'var(--font-size-lg)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {currencySymbol} {Number(pricing?.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.75rem' }}>
                  {messages.telebirrDetails || 'Telebirr Payment Details'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {messages.merchantLabel || 'Merchant'}
                    </span>
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                      {telebirrConfig.merchantName || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {messages.shortcodeLabel || 'Shortcode'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 'var(--font-weight-medium)', fontFamily: 'var(--font-family-mono)' }}>
                        {telebirrConfig.shortcode || 'N/A'}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(telebirrConfig.shortcode, 'shortcode')}
                        style={{
                          padding: '2px 6px',
                          fontSize: 'var(--font-size-xs)',
                          color: copiedField === 'shortcode' ? 'var(--color-success)' : 'var(--color-primary)',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          fontWeight: 'var(--font-weight-medium)',
                        }}
                      >
                        {copiedField === 'shortcode' ? (messages.copied || 'Copied!') : (messages.copy || 'Copy')}
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid var(--color-border-light)',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {messages.amountLabel || 'Amount'}
                    </span>
                    <span
                      style={{
                        fontWeight: 'var(--font-weight-bold)',
                        fontSize: 'var(--font-size-lg)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {currencySymbol} {Number(pricing?.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Transaction Number Input */}
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '0.5rem' }}>
              {paymentMethod === 'bank_transfer'
                ? messages.transactionReferenceNumber || 'Transaction Reference Number'
                : messages.telebirrTransactionId || 'Telebirr Transaction ID'}
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginBottom: '0.75rem' }}>
              {messages.enterTransactionHint || 'After sending payment, enter the reference number from your confirmation SMS.'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <Input
                  id="transactionNumber"
                  value={transactionNumber}
                  onChange={handleTransactionChange}
                  placeholder={
                    paymentMethod === 'bank_transfer'
                      ? messages.transactionPlaceholderBank || 'e.g., FT1234567890'
                      : messages.transactionPlaceholderTelebirr || 'e.g., TB123456789'
                  }
                  error={transactionError}
                  disabled={isSubmitting}
                />
              </div>
              <Button
                variant="outline"
                size="md"
                onClick={handleValidateTransaction}
                isLoading={isValidatingTransaction}
                disabled={
                  !transactionNumber ||
                  transactionNumber.trim().length < 3 ||
                  isSubmitting
                }
              >
                {messages.verify || 'Verify'}
              </Button>
            </div>

            {isTransactionValid && (
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-success)',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                ✓ {messages.transactionVerified || 'Transaction number verified — not previously used.'}
              </p>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <Input
              id="proofNotes"
              type="textarea"
              label={messages.additionalNotesLabel || 'Additional Notes (optional)'}
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              placeholder={messages.additionalNotesPlaceholder || 'Any additional information about your payment...'}
              disabled={isSubmitting}
            />
          </div>

          {/* Submit Error */}
          {submitError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--color-error-light)',
                color: 'var(--color-error)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              {submitError}
            </div>
          )}

          {/* Important Notice */}
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--color-info-light)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-xs)',
              color: '#1E40AF',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              {messages.importantNotice ||
                'Complete the payment first, then enter the transaction number. Your booking will be confirmed after payment verification.'}
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              {messages.cancel || 'Cancel'}
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmitBooking}
              isLoading={isSubmitting}
              disabled={!isTransactionValid || isSubmitting}
              style={{ flex: 2 }}
            >
              {messages.submitAndBook || 'Submit & Book'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}