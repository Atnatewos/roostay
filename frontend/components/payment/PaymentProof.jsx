// frontend/components/payment/PaymentProof.jsx
// Payment proof upload component for manual bank transfer verification
// Supports image upload with preview and submission via Cloudinary
'use client';

const { useState, useRef } = require('react');
const Button = require('@components/ui/Button').default;
const { api, apiClient, ApiError } = require('@lib/api');

/**
 * Payment proof upload component.
 * Allows users to upload a receipt/screenshot as proof of bank transfer payment.
 * Includes image preview, notes field, and submission handling.
 * 
 * @param {Object} props
 * @param {string} props.paymentId - The payment ID to attach proof to
 * @param {Function} [props.onSuccess] - Callback after successful upload
 */
function PaymentProof({ paymentId, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  /**
   * Handles file selection and generates a preview.
   * Validates file type and size before accepting.
   * @param {Event} e - File input change event
   */
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, WebP, or AVIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Removes the selected file and resets the preview.
   */
  function handleRemoveFile() {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  /**
   * Uploads the payment proof to the server.
   * First uploads the image to Cloudinary via /api/upload, then submits the proof URL.
   */
  async function handleSubmit() {
    if (!selectedFile) {
      setError('Please select a receipt image to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Create form data for image upload
      const formData = new FormData();
      formData.append('images', selectedFile);
      formData.append('folder', 'payment-proofs');

      // Upload image to Cloudinary via backend API
      const uploadResponse = await api('/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      const imageUrl = uploadResponse.data?.images?.[0]?.url;

      if (!imageUrl) {
        throw new Error('Failed to get image URL after upload.');
      }

      setUploadProgress(100);

      // Submit proof URL to payment API
      await apiClient.post(`/payments/${paymentId}/proof`, {
        proofImageUrl: imageUrl,
        notes: notes || null,
      });

      if (onSuccess) {
        onSuccess({ imageUrl, notes });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="payment-proof">
      <h3 className="payment-proof__title">Upload Payment Receipt</h3>
      
      {/* File Upload Area */}
      <div className="payment-proof__upload-area">
        {previewUrl ? (
          <div className="payment-proof__preview">
            <img
              src={previewUrl}
              alt="Payment receipt preview"
              className="payment-proof__preview-image"
            />
            <button
              className="payment-proof__remove"
              onClick={handleRemoveFile}
              type="button"
              aria-label="Remove image"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            className="payment-proof__upload-btn"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Click to upload receipt</span>
            <span className="payment-proof__upload-hint">JPEG, PNG, WebP (max 5MB)</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleFileSelect}
          className="payment-proof__file-input"
          hidden
        />
      </div>

      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="payment-proof__progress">
          <div
            className="payment-proof__progress-bar"
            style={{ width: `${uploadProgress}%` }}
          />
          <span className="payment-proof__progress-text">{uploadProgress}%</span>
        </div>
      )}

      {/* Notes Field */}
      <div className="payment-proof__notes">
        <label htmlFor="proof-notes" className="payment-proof__label">
          Notes (optional)
        </label>
        <textarea
          id="proof-notes"
          className="input input--textarea"
          placeholder="Add any additional information about your payment..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="payment-proof__error">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        fullWidth
        onClick={handleSubmit}
        isLoading={isUploading}
        disabled={!selectedFile}
      >
        Submit Payment Proof
      </Button>
    </div>
  );
}

module.exports = PaymentProof;