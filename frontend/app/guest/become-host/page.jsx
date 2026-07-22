// frontend/app/guest/become-host/page.jsx
// Dedicated page for guests to apply for host status
// Includes identity verification, hosting experience, and agreement sections
// Handles image uploads via the /api/upload endpoint using base64 encoding
// Uses custom toast notifications instead of browser alerts
// Author: Theron
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import useAuth from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Reusable Image Upload Field Component
 * Converts selected files to base64 and uploads to Cloudinary via the API.
 * Displays a preview of the uploaded image with an option to remove it.
 *
 * @param {Object}   props
 * @param {string}   props.label    - Display label for the upload field
 * @param {string}   props.value    - Current image URL (if already uploaded)
 * @param {Function} props.onChange - Callback with the new image URL
 * @param {string}   [props.error]  - Validation error message to display
 */
function ImageUploadField({ label, value, onChange, error }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  /**
   * Handles file selection, converts to base64, and uploads to Cloudinary.
   * Validates file type and size before attempting upload.
   *
   * @param {Event} e - File input change event
   */
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type using centralized constants
    if (!constants.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate file size using centralized constants
    if (file.size > constants.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${constants.MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);

    // Convert file to base64 using FileReader
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result;

      try {
        // Send base64 image as JSON to the upload endpoint
        const response = await apiClient.post('/upload', {
          image: base64Image,
          folder: 'verifications',
        });

        // Extract URL from the upload response
        const imageUrl = response.data?.url;
        if (imageUrl) {
          onChange(imageUrl);
          toast.success('Image uploaded successfully.');
        } else {
          throw new Error('Invalid upload response format');
        }
      } catch (err) {
        console.error('Image upload failed:', err);
        if (err instanceof ApiError) {
          toast.error(err.message);
        } else {
          toast.error('Failed to upload image. Please try again.');
        }
      } finally {
        setIsUploading(false);
        // Clear the file input so the same file can be re-selected if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file. Please try another image.');
      setIsUploading(false);
    };

    // Start reading the file as a base64 data URL
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        style={{
          display: 'block',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          marginBottom: '0.5rem',
        }}
      >
        {label} <span style={{ color: 'var(--color-error)' }}>*</span>
      </label>

      {value ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '200px',
            aspectRatio: '1',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
          }}
        >
          <img
            src={value}
            alt="Uploaded ID"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
            aria-label="Remove image"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          style={{
            width: '100%',
            maxWidth: '200px',
            aspectRatio: '1',
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isUploading ? 'wait' : 'pointer',
            backgroundColor: 'var(--color-bg-secondary)',
            transition: 'border-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!isUploading) e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          {isUploading ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Uploading...
            </p>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                width="32"
                height="32"
                fill="none"
                stroke="var(--color-text-light)"
                strokeWidth="1.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-xs)',
                  marginTop: '0.5rem',
                }}
              >
                Click to upload
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={constants.ALLOWED_IMAGE_TYPES.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {error && (
        <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', marginTop: '0.25rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Become a Host Page
 * Multi-section form for guests to apply for host privileges.
 * Validates input, uploads ID images via base64, and submits the application for admin review.
 * Uses custom toast notifications for user feedback.
 * Wrapped in a client-only guard to prevent SSR prerender errors.
 */
function BecomeHostContent() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  // Form state
  const [form, setForm] = useState({
    idType: 'kebele_id',
    idNumber: '',
    idFrontImageUrl: '',
    idBackImageUrl: '',
    hostingExperience: 'no',
    propertyCount: '1-2',
    motivation: '',
    agreeTerms: false,
    agreeAccuracy: false,
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect if not authenticated or already a host
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role !== 'guest') {
      router.push('/host/dashboard');
    }
  }, [authLoading, isAuthenticated, user, router]);

  /**
   * Updates a form field and clears its validation error.
   *
   * @param {string} field - Field name to update
   * @param {*}      value - New field value
   */
  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  }

  /**
   * Validates the form before submission.
   * Checks required fields and agreement checkboxes.
   *
   * @returns {boolean} True if all validation passes
   */
  function validateForm() {
    const errors = {};
    if (!form.idNumber.trim()) errors.idNumber = 'ID number is required.';
    if (!form.idFrontImageUrl) errors.idFrontImageUrl = 'Please upload the front of your ID.';
    if (!form.agreeTerms || !form.agreeAccuracy) errors.agreement = 'You must agree to the terms and confirm accuracy.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Handles form submission.
   * Validates input, sends application to API, and shows success/error toasts.
   *
   * @param {Event} e - Form submit event
   */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post('/users/apply-host', {
        idType: form.idType,
        idNumber: form.idNumber.trim(),
        idFrontImageUrl: form.idFrontImageUrl,
        idBackImageUrl: form.idBackImageUrl || null,
        hostingExperience: form.hostingExperience,
        propertyCount: form.propertyCount,
        motivation: form.motivation.trim() || null,
      });

      setIsSuccess(true);
      toast.success('Application submitted successfully!');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError('Failed to submit application. Please try again.');
        toast.error('Failed to submit application. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading state while checking authentication
  if (authLoading) {
    return (
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Unauthenticated state — prompt user to log in
  if (!isAuthenticated) {
    return (
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}>
        <h1>Please log in to become a host</h1>
        <Button variant="primary" onClick={() => router.push('/login?redirect=/guest/become-host')}>
          Log In
        </Button>
      </div>
    );
  }

  // Success state — application submitted
  if (isSuccess) {
    return (
      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '600px', textAlign: 'center' }}>
        <div
          style={{
            padding: '3rem',
            backgroundColor: 'var(--color-success-light)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-success)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <h1
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#065F46',
              marginBottom: '0.5rem',
            }}
          >
            Application Submitted!
          </h1>
          <p style={{ color: '#065F46', lineHeight: '1.6' }}>
            Thank you for applying to become a ROOSTAY host. Our team will review your
            identity and application within 24-48 hours. We will notify you via email once
            a decision has been made.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push('/guest/dashboard')}
            style={{ marginTop: '1.5rem' }}
          >
            Return to Dashboard
          </Button>
        </div>
      </main>
    );
  }

  // Main form state
  return (
    <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '700px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
          Become a Host
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
          Share your space and earn money. Please complete the verification process below
          to get started.
        </p>
      </div>

      {/* Global error message */}
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-error-light)',
            color: 'var(--color-error)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Identity Verification */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '1.25rem',
            }}
          >
            1. Identity Verification
          </h2>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: '1.5rem',
            }}
          >
            We need to verify your identity to ensure the safety of our community. Your
            documents are encrypted and securely stored.
          </p>

          <Input
            id="idType"
            type="select"
            label="ID Type"
            value={form.idType}
            onChange={(e) => handleChange('idType', e.target.value)}
            options={[
              { value: 'kebele_id', label: 'Kebele ID' },
              { value: 'passport', label: 'Passport' },
              { value: 'drivers_license', label: "Driver's License" },
              { value: 'national_id', label: 'National ID (Fayda)' },
            ]}
            required
          />

          <Input
            id="idNumber"
            label="ID Number"
            value={form.idNumber}
            onChange={(e) => handleChange('idNumber', e.target.value)}
            error={fieldErrors.idNumber}
            placeholder="Enter your ID number"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            <ImageUploadField
              label="ID Front Side"
              value={form.idFrontImageUrl}
              onChange={(url) => handleChange('idFrontImageUrl', url)}
              error={fieldErrors.idFrontImageUrl}
            />
            <ImageUploadField
              label="ID Back Side (Optional)"
              value={form.idBackImageUrl}
              onChange={(url) => handleChange('idBackImageUrl', url)}
            />
          </div>
        </Card>

        {/* Section 2: Hosting Experience */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '1.25rem',
            }}
          >
            2. Hosting Experience
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: '0.75rem',
              }}
            >
              Have you hosted before?{' '}
              <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  flex: 1,
                  padding: '0.75rem',
                  border: `1px solid ${form.hostingExperience === 'yes' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor:
                    form.hostingExperience === 'yes'
                      ? 'var(--color-primary-light)'
                      : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="experience"
                  value="yes"
                  checked={form.hostingExperience === 'yes'}
                  onChange={() => handleChange('hostingExperience', 'yes')}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Yes, I have experience
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  flex: 1,
                  padding: '0.75rem',
                  border: `1px solid ${form.hostingExperience === 'no' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor:
                    form.hostingExperience === 'no'
                      ? 'var(--color-primary-light)'
                      : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="experience"
                  value="no"
                  checked={form.hostingExperience === 'no'}
                  onChange={() => handleChange('hostingExperience', 'no')}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                No, this is my first time
              </label>
            </div>
          </div>

          <Input
            id="propertyCount"
            type="select"
            label="How many properties do you want to list?"
            value={form.propertyCount}
            onChange={(e) => handleChange('propertyCount', e.target.value)}
            options={[
              { value: '1-2', label: '1-2 properties' },
              { value: '3-5', label: '3-5 properties' },
              { value: '5+', label: '5+ properties' },
            ]}
            required
          />

          <Input
            id="motivation"
            type="textarea"
            label="Why do you want to become a host? (Optional)"
            value={form.motivation}
            onChange={(e) => handleChange('motivation', e.target.value)}
            placeholder="Tell us about your goals and what makes your space special..."
            rows={4}
          />
        </Card>

        {/* Section 3: Agreement & Submit */}
        <Card
          padding="lg"
          style={{
            marginBottom: '1.5rem',
            border: fieldErrors.agreement
              ? '1px solid var(--color-error)'
              : '1px solid var(--color-border)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '1.25rem',
            }}
          >
            3. Agreement & Submit
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                lineHeight: '1.5',
              }}
            >
              <input
                type="checkbox"
                checked={form.agreeTerms}
                onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  marginTop: '2px',
                  accentColor: 'var(--color-primary)',
                }}
              />
              <span>
                I agree to the{' '}
                <a
                  href="#"
                  style={{
                    color: 'var(--color-primary)',
                    textDecoration: 'underline',
                  }}
                >
                  ROOSTAY Host Terms and Conditions
                </a>{' '}
                and Community Standards.
              </span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                lineHeight: '1.5',
              }}
            >
              <input
                type="checkbox"
                checked={form.agreeAccuracy}
                onChange={(e) => handleChange('agreeAccuracy', e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  marginTop: '2px',
                  accentColor: 'var(--color-primary)',
                }}
              />
              <span>
                I confirm that all information and documents provided are accurate and
                true.
              </span>
            </label>
          </div>

          {fieldErrors.agreement && (
            <p
              style={{
                color: 'var(--color-error)',
                fontSize: 'var(--font-size-xs)',
                marginBottom: '1rem',
              }}
            >
              {fieldErrors.agreement}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            disabled={!form.agreeTerms || !form.agreeAccuracy}
          >
            Submit Application
          </Button>
        </Card>
      </form>
    </main>
  );
}

/**
 * Become a Host Page — Default Export
 * Wraps content in layout and uses client-only mounting to prevent
 * SSR prerender errors with useToast during static page generation.
 */
export default function BecomeHostPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Return static shell during SSR to prevent useToast errors
  if (!isMounted) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}>
          <p>Loading...</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <BecomeHostContent />
      <Footer />
    </>
  );
}