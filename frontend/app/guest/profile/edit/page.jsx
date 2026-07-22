// frontend/app/guest/profile/edit/page.jsx
// Edit Profile Page — form to update user profile information
// Allows editing first name, last name, phone number, and profile image
// Validates input before submission and shows success/error feedback
// Fetches existing data via the API — no localStorage dependency
// Author: Theron

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Edit Profile Page
 * Provides a form for authenticated users to update their profile information.
 * Pre-populates form fields with existing data fetched from the API.
 * Handles validation errors and displays success/error messages.
 */
export default function EditProfilePage() {
  const router = useRouter();

  // Form state — holds current values for each editable field
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    profileImageUrl: '',
  });

  // UI state — tracks loading, submission, errors, and success
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  /**
   * Fetches existing profile data from the API to pre-fill the form.
   * Uses /auth/me endpoint — the single source of truth for user data.
   * Runs once on component mount.
   */
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await apiClient.get('/auth/me');

        if (response?.data?.user) {
          const user = response.data.user;
          setForm({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phoneNumber: user.phoneNumber || '',
            profileImageUrl: user.profileImageUrl || '',
          });
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push(constants.ROUTES.LOGIN);
        } else {
          setError('Failed to load profile data.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  /**
   * Updates a single form field value.
   * Clears field-level errors when the user starts typing.
   *
   * @param {Event} e - Input change event
   */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear field-level error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }

    // Clear success message when user makes changes
    if (success) {
      setSuccess(false);
    }
  }

  /**
   * Validates the form before submission.
   * Checks required fields and phone number format.
   *
   * @returns {boolean} True if form is valid
   */
  function validateForm() {
    const errors = {};

    if (!form.firstName.trim()) {
      errors.firstName = 'First name is required.';
    } else if (form.firstName.trim().length > 100) {
      errors.firstName = 'First name must be less than 100 characters.';
    }

    if (!form.lastName.trim()) {
      errors.lastName = 'Last name is required.';
    } else if (form.lastName.trim().length > 100) {
      errors.lastName = 'Last name must be less than 100 characters.';
    }

    if (form.phoneNumber && !/^(\+251|0)[9]\d{8}$/.test(form.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid Ethiopian phone number.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Handles form submission.
   * Validates input, sends update to API, and handles response.
   *
   * @param {Event} e - Form submit event
   */
  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Only send fields that have values to avoid overwriting with empty strings
      const updateData = {};
      if (form.firstName.trim()) updateData.firstName = form.firstName.trim();
      if (form.lastName.trim()) updateData.lastName = form.lastName.trim();
      if (form.phoneNumber) updateData.phoneNumber = form.phoneNumber;
      if (form.profileImageUrl) updateData.profileImageUrl = form.profileImageUrl;

      await apiClient.put('/users/profile', updateData);

      setSuccess(true);

      // Redirect back to profile after a short delay
      setTimeout(() => {
        router.push(constants.ROUTES.GUEST_PROFILE);
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Loading state — skeleton while fetching existing data
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '500px' }}>
          <Skeleton type="text" width="200px" />
          <Skeleton type="text" width="150px" />
          <Skeleton type="rect" height="300px" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '500px' }}>
        {/* Page Header with back navigation */}
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href={constants.ROUTES.GUEST_PROFILE}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              marginBottom: '1rem',
            }}
          >
            &larr; Back to Profile
          </Link>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Edit Profile
          </h1>
        </div>

        {/* Edit Form Card */}
        <Card padding="lg">
          {/* Success Message — Shown after successful update */}
          {success && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--color-success-light)',
                color: '#065F46',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                fontSize: 'var(--font-size-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>&#10003;</span>
              Profile updated successfully! Redirecting...
            </div>
          )}

          {/* Error Message — Shown on API failure */}
          {error && (
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
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* First Name Input */}
            <Input
              id="firstName"
              name="firstName"
              label="First Name"
              value={form.firstName}
              onChange={handleChange}
              error={fieldErrors.firstName}
              required
              placeholder="Enter your first name"
            />

            {/* Last Name Input */}
            <Input
              id="lastName"
              name="lastName"
              label="Last Name"
              value={form.lastName}
              onChange={handleChange}
              error={fieldErrors.lastName}
              required
              placeholder="Enter your last name"
            />

            {/* Phone Number Input */}
            <Input
              id="phoneNumber"
              name="phoneNumber"
              label="Phone Number"
              value={form.phoneNumber}
              onChange={handleChange}
              error={fieldErrors.phoneNumber}
              placeholder="0911223344"
              helperText="Ethiopian phone number format (09XXXXXXXX or +2519XXXXXXXX)"
            />

            {/* Profile Image URL Input */}
            <Input
              id="profileImageUrl"
              name="profileImageUrl"
              label="Profile Image URL"
              value={form.profileImageUrl}
              onChange={handleChange}
              placeholder="https://example.com/your-image.jpg"
              helperText="Provide a URL to your profile picture"
            />

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <Link
                href={constants.ROUTES.GUEST_PROFILE}
                className="btn btn--outline"
                style={{ flex: 1 }}
              >
                Cancel
              </Link>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSaving}
                style={{ flex: 2 }}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </main>

      <Footer />
    </>
  );
}