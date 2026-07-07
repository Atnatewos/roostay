// frontend/components/payment/PaymentForm.jsx
// Payment method selection and bank transfer instructions display
// Supports bank transfer and Telebirr payment methods

'use client';

const { useState } = require('react');
const Button = require('@components/ui/Button').default;
const constants = require('@lib/constants');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    payment: {
      bankTransfer: {
        bankName: 'Commercial Bank of Ethiopia',
        accountNumber: '1000000000000',
        accountHolder: 'ROOSTAY PLC',
        referencePrefix: 'ROOSTAY',
        instructions: 'Please transfer the total amount and upload your receipt.',
      },
    },
  };
}

/**
 * Payment form component for selecting payment method and viewing instructions.
 * Displays bank transfer details or Telebirr payment flow.
 *
 * @param {Object} props
 * @param {number} props.amount - Total amount to pay
 * @param {string} [props.bookingId] - Associated booking ID for reference
 * @param {Function} [props.onMethodSelect] - Callback when payment method is selected
 * @param {string} [props.selectedMethod='bank_transfer'] - Currently selected method
 */
function PaymentForm({ amount, bookingId, onMethodSelect, selectedMethod = 'bank_transfer' }) {
  const [method, setMethod] = useState(selectedMethod);
  const [copiedField, setCopiedField] = useState(null);

  const referenceCode = bookingId
    ? `${config.payment?.bankTransfer?.referencePrefix || 'ROOSTAY'}-${bookingId.substring(0, 8).toUpperCase()}`
    : '';

  /**
   * Handles payment method selection.
   *
   * @param {string} newMethod - Selected payment method
   */
  function handleMethodChange(newMethod) {
    setMethod(newMethod);
    if (onMethodSelect) {
      onMethodSelect(newMethod);
    }
  }

  /**
   * Copies text to clipboard and shows a temporary confirmation.
   *
   * @param {string} text - Text to copy
   * @param {string} field - Field identifier for feedback
   */
  async function copyToClipboard(text, field) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }

  const bankConfig = config.payment?.bankTransfer || {};

  return (
    <div className="payment-form">
      <h3 className="payment-form__title">Payment Method</h3>

      {/* Method Selection */}
      <div className="payment-form__methods">
        <button
          className={`payment-form__method ${method === 'bank_transfer' ? 'payment-form__method--active' : ''}`}
          onClick={() => handleMethodChange('bank_transfer')}
          type="button"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>Bank Transfer</span>
        </button>

        {config.payment?.telebirr?.enabled && (
          <button
            className={`payment-form__method ${method === 'telebirr' ? 'payment-form__method--active' : ''}`}
            onClick={() => handleMethodChange('telebirr')}
            type="button"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <span>Telebirr</span>
          </button>
        )}
      </div>

      {/* Bank Transfer Instructions */}
      {method === 'bank_transfer' && (
        <div className="payment-form__instructions">
          <h4 className="payment-form__instructions-title">Bank Transfer Details</h4>
          <p className="payment-form__instructions-text">
            {bankConfig.instructions || 'Transfer the exact amount and upload your receipt for verification.'}
          </p>

          <div className="payment-form__details">
            <div className="payment-form__detail-row">
              <span className="payment-form__detail-label">Bank</span>
              <span className="payment-form__detail-value">{bankConfig.bankName || 'N/A'}</span>
            </div>

            <div className="payment-form__detail-row">
              <span className="payment-form__detail-label">Account Number</span>
              <div className="payment-form__detail-copy">
                <span className="payment-form__detail-value">{bankConfig.accountNumber || 'N/A'}</span>
                <button
                  className="payment-form__copy-btn"
                  onClick={() => copyToClipboard(bankConfig.accountNumber, 'account')}
                  type="button"
                  aria-label="Copy account number"
                >
                  {copiedField === 'account' ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="payment-form__detail-row">
              <span className="payment-form__detail-label">Account Holder</span>
              <span className="payment-form__detail-value">{bankConfig.accountHolder || 'N/A'}</span>
            </div>

            <div className="payment-form__detail-row">
              <span className="payment-form__detail-label">Amount</span>
              <div className="payment-form__detail-copy">
                <span className="payment-form__detail-value payment-form__detail-value--highlight">
                  {constants.CURRENCY_SYMBOL} {amount.toLocaleString()}
                </span>
                <button
                  className="payment-form__copy-btn"
                  onClick={() => copyToClipboard(amount.toString(), 'amount')}
                  type="button"
                  aria-label="Copy amount"
                >
                  {copiedField === 'amount' ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {referenceCode && (
              <div className="payment-form__detail-row">
                <span className="payment-form__detail-label">Reference</span>
                <div className="payment-form__detail-copy">
                  <span className="payment-form__detail-value payment-form__detail-value--code">
                    {referenceCode}
                  </span>
                  <button
                    className="payment-form__copy-btn"
                    onClick={() => copyToClipboard(referenceCode, 'reference')}
                    type="button"
                    aria-label="Copy reference code"
                  >
                    {copiedField === 'reference' ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="payment-form__notice">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p>
              Please use the exact reference code when making the transfer.
              Your booking will be confirmed within 24-48 hours after payment verification.
            </p>
          </div>
        </div>
      )}

      {/* Telebirr Instructions */}
      {method === 'telebirr' && (
        <div className="payment-form__instructions">
          <h4 className="payment-form__instructions-title">Telebirr Payment</h4>
          <p className="payment-form__instructions-text">
            You will be redirected to Telebirr to complete your payment securely.
          </p>

          <div className="payment-form__details">
            <div className="payment-form__detail-row">
              <span className="payment-form__detail-label">Amount</span>
              <span className="payment-form__detail-value payment-form__detail-value--highlight">
                {constants.CURRENCY_SYMBOL} {amount.toLocaleString()}
              </span>
            </div>
          </div>

          <Button variant="primary" fullWidth>
            Pay with Telebirr
          </Button>
        </div>
      )}
    </div>
  );
}

module.exports = PaymentForm;