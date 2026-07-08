// frontend/components/booking/BookingPaymentModal.jsx
// Payment-first booking modal — collects transaction number before creating booking
// Displays bank/Telebirr details, validates transaction uniqueness, and submits booking
// Integrates with the new payment-flow API endpoints
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import CountdownTimer from '@/components/ui/CountdownTimer';
import PriceBreakdown from '@/components/booking/PriceBreakdown';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Booking Payment Modal
 * Appears when a guest clicks "Book Now" on a listing detail page.
 * Requires the guest to enter a transaction reference number before the booking is created.
 * Displays payment instructions (bank account or Telebirr details) and validates
 * that the transaction number has not been previously used in a completed payment.
 *
 * Flow:
 * 1. Guest selects dates and guests → clicks "Book Now"
 * 2. Modal opens showing payment details and transaction number input
 * 3. Guest enters transaction number (validated for uniqueness)
 * 4. Guest clicks "Submit & Book" → booking + payment created together
 * 5. 30-minute countdown starts for the guest to complete the actual transfer
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen            - Whether the modal is visible
 * @param {Function} props.onClose           - Callback to close the modal
 * @param {Object}   props.listing           - Full listing data object
 * @param {Object}   props.bookingData       - Booking details { checkInDate, checkOutDate, guestCount, bookingType }
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
  // PAYMENT METHOD STATE
  // Tracks which payment method the guest selects (bank_transfer or telebirr)
  // =========================================================================
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');

  // =========================================================================
  // TRANSACTION NUMBER STATE
  // The reference number from the guest's bank transfer or Telebirr payment
  // =========================================================================
  const [transactionNumber, setTransactionNumber] = useState('');

  // =========================================================================
  // TRANSACTION VALIDATION STATE
  // Tracks whether the entered transaction number is unique and valid
  // =========================================================================
  const [isValidatingTransaction, setIsValidatingTransaction] = useState(false);
  const [transactionError, setTransactionError] = useState(null);
  const [isTransactionValid, setIsTransactionValid] = useState(false);

  // =========================================================================
  // OPTIONAL NOTES STATE
  // Additional notes the guest can provide about their payment
  // =========================================================================
  const [proofNotes, setProofNotes] = useState('');

  // =========================================================================
  // SUBMISSION STATE
  // Tracks the booking submission process
  // =========================================================================
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // =========================================================================
  // SUCCESS STATE
  // Stores the API response after successful booking creation
  // =========================================================================
  const [bookingResult, setBookingResult] = useState(null);

  // =========================================================================
  // COPIED FIELD STATE
  // Tracks which payment detail was recently copied for visual feedback
  // =========================================================================
  const [copiedField, setCopiedField] = useState(null);

  /**
   * Resets all form state when the modal opens or closes.
   * Ensures a clean slate for each new booking attempt.
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
    }
  }, [isOpen]);

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
    const value = e.target.value;
    setTransactionNumber(value);
    setTransactionError(null);
    setIsTransactionValid(false);
  }

  /**
   * Validates the transaction number against the API.
   * Checks if the number has already been used in a completed payment.
   * Debounces naturally through user action — only fires on explicit check.
   */
  async function handleValidateTransaction() {
    if (!transactionNumber || transactionNumber.trim().length < 3) {
      setTransactionError('Please enter a valid transaction reference number.');
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
          response?.data?.message || 'This transaction number has already been used.'
        );
      }
    } catch (err) {
      setIsTransactionValid(false);
      if (err instanceof ApiError) {
        setTransactionError(err.message);
      } else {
        setTransactionError('Failed to validate transaction number. Please try again.');
      }
    } finally {
      setIsValidatingTransaction(false);
    }
  }

  /**
   * Submits the booking with payment information to the API.
   * Creates the booking and payment record in a single atomic operation.
   * On success, displays the booking confirmation with countdown timer.
   */
  async function handleSubmitBooking() {
    // Validate transaction number is present and verified
    if (!transactionNumber || transactionNumber.trim().length < 3) {
      setTransactionError('Please enter a valid transaction reference number.');
      return;
    }

    if (!isTransactionValid) {
      setTransactionError('Please verify your transaction number before submitting.');
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

      // Notify parent component of successful booking
      if (onBookingComplete) {
        onBookingComplete(response.data);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Failed to create booking. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Copies text to the clipboard with fallback for older browsers.
   * Shows a temporary confirmation state on the copied button.
   *
   * @param {string} text  - The text to copy
   * @param {string} field - Identifier for the copied field (for visual feedback)
   */
  async function copyToClipboard(text, field) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
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
   * Closes the modal or updates state when time runs out.
   */
  function handleCountdownExpire() {
    // The booking is already created — if payment isn't verified in time,
    // the admin can manually expire it. Here we just show expiry state.
    if (bookingResult) {
      setBookingResult((prev) => ({
        ...prev,
        expired: true,
      }));
    }
  }

  /**
   * Returns the bank transfer details for display.
   * In production, these would come from the API or environment variables.
   */
  function getBankDetails() {
    return {
      bankName: 'Commercial Bank of Ethiopia',
      accountNumber: '1000000000000',
      accountHolder: 'ROOSTAY PLC',
      referencePrefix: 'ROOSTAY',
    };
  }

  /**
   * Returns the Telebirr payment details for display.
   */
  function getTelebirrDetails() {
    return {
      shortcode: '123456',
      merchantName: 'ROOSTAY',
    };
  }

  const bankDetails = getBankDetails();
  const telebirrDetails = getTelebirrDetails();

  // Calculate the expiry time for the countdown
  const expiryTime = bookingResult?.paymentTimeout?.expiresAt
    ? new Date(bookingResult.paymentTimeout.expiresAt)
    : new Date(Date.now() + 30 * 60 * 1000);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bookingResult ? 'Booking Confirmed' : 'Complete Your Booking'}
      size="md"
      closeOnOverlay={!isSubmitting}
    >
      {/* =====================================================================
          SUCCESS STATE — Shown after booking is successfully created
          Displays confirmation message, countdown timer, and next steps
          ===================================================================== */}
      {bookingResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Success Message */}
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--color-success-light)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              &#10003;
            </div>
            <p style={{ fontWeight: 'var(--font-weight-semibold)', color: '#065F46', marginBottom: '0.25rem' }}>
              Booking Created Successfully!
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: '#065F46' }}>
              Booking #{bookingResult.booking?.id?.substring(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Countdown Timer */}
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
              Complete your bank transfer within:
            </p>
            <CountdownTimer
              expiresAt={expiryTime}
              onExpire={handleCountdownExpire}
              size="md"
            />
          </div>

          {/* Payment Instructions Reminder */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.5rem' }}>
              Payment Instructions
            </p>
            {paymentMethod === 'bank_transfer' ? (
              <>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  Bank: {bankDetails.bankName}
                </p>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  Account: {bankDetails.accountNumber}
                </p>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  Amount: {constants.CURRENCY_SYMBOL} {Number(pricing?.totalAmount || bookingResult?.pricing?.totalAmount).toLocaleString()}
                </p>
                <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-xs)', marginTop: '0.5rem' }}>
                  Reference: {bookingResult?.payment?.transaction_reference}
                </p>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  Pay to: {telebirrDetails.merchantName}
                </p>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  Shortcode: {telebirrDetails.shortcode}
                </p>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  Amount: {constants.CURRENCY_SYMBOL} {Number(pricing?.totalAmount || bookingResult?.pricing?.totalAmount).toLocaleString()}
                </p>
              </>
            )}
          </div>

          {/* Close Button */}
          <Button variant="primary" fullWidth onClick={onClose}>
            View My Bookings
          </Button>
        </div>
      ) : (
        /* ===================================================================
            FORM STATE — Payment method selection and transaction input
            Shown before the booking is submitted
            =================================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Pricing Summary */}
          {pricing && (
            <PriceBreakdown
              pricing={pricing}
              bookingType={bookingData?.bookingType || 'short_term'}
              compact
            />
          )}

          {/* Payment Method Selection */}
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '0.75rem' }}>
              Select Payment Method
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {/* Bank Transfer Option */}
              <button
                type="button"
                className={`payment-form__method ${paymentMethod === 'bank_transfer' ? 'payment-form__method--active' : ''}`}
                onClick={() => handleMethodChange('bank_transfer')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  backgroundColor: paymentMethod === 'bank_transfer' ? 'var(--color-primary-light)' : 'transparent',
                  borderColor: paymentMethod === 'bank_transfer' ? 'var(--color-primary)' : 'var(--color-border)',
                }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                  Bank Transfer
                </span>
              </button>

              {/* Telebirr Option */}
              <button
                type="button"
                className={`payment-form__method ${paymentMethod === 'telebirr' ? 'payment-form__method--active' : ''}`}
                onClick={() => handleMethodChange('telebirr')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  backgroundColor: paymentMethod === 'telebirr' ? 'var(--color-primary-light)' : 'transparent',
                  borderColor: paymentMethod === 'telebirr' ? 'var(--color-primary)' : 'var(--color-border)',
                }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                  Telebirr
                </span>
              </button>
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
                {/* Bank Transfer Instructions */}
                <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.75rem' }}>
                  Bank Transfer Details
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Bank Name */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Bank</span>
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{bankDetails.bankName}</span>
                  </div>

                  {/* Account Number with Copy Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Account Number</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 'var(--font-weight-medium)', fontFamily: 'var(--font-family-mono)' }}>
                        {bankDetails.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(bankDetails.accountNumber, 'account')}
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
                        {copiedField === 'account' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Account Holder */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Account Holder</span>
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{bankDetails.accountHolder}</span>
                  </div>

                  {/* Amount to Transfer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border-light)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Amount to Transfer</span>
                    <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)', color: 'var(--color-primary)' }}>
                      {constants.CURRENCY_SYMBOL} {Number(pricing?.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Telebirr Instructions */}
                <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.75rem' }}>
                  Telebirr Payment Details
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Merchant</span>
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{telebirrDetails.merchantName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Shortcode</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 'var(--font-weight-medium)', fontFamily: 'var(--font-family-mono)' }}>
                        {telebirrDetails.shortcode}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(telebirrDetails.shortcode, 'shortcode')}
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
                        {copiedField === 'shortcode' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border-light)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Amount</span>
                    <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)', color: 'var(--color-primary)' }}>
                      {constants.CURRENCY_SYMBOL} {Number(pricing?.totalAmount || 0).toLocaleString()}
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
                ? 'Transaction Reference Number'
                : 'Telebirr Transaction ID'}
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginBottom: '0.75rem' }}>
              Enter the reference number from your payment confirmation. This helps us verify your payment.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <Input
                  id="transactionNumber"
                  value={transactionNumber}
                  onChange={handleTransactionChange}
                  placeholder={
                    paymentMethod === 'bank_transfer'
                      ? 'e.g., FT1234567890'
                      : 'e.g., TB123456789'
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
                disabled={!transactionNumber || transactionNumber.trim().length < 3 || isSubmitting}
              >
                Verify
              </Button>
            </div>

            {/* Transaction Validation Feedback */}
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
                &#10003; Transaction number verified — not previously used.
              </p>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <Input
              id="proofNotes"
              type="textarea"
              label="Additional Notes (optional)"
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              placeholder="Any additional information about your payment..."
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
              Your booking will be created immediately but confirmed only after payment verification.
              Please complete the transfer within the time limit to avoid automatic cancellation.
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
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmitBooking}
              isLoading={isSubmitting}
              disabled={!isTransactionValid || isSubmitting}
              style={{ flex: 2 }}
            >
              Submit & Book
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}