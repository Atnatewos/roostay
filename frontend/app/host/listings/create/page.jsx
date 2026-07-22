// frontend/app/host/listings/create/page.jsx
// Create Listing Page
// Multi-section form for hosts to add new property listings
// Includes professional multi-image upload, pricing, location, and amenities
// Uses client-only mounting to prevent SSR prerender errors with useToast
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
import ImageUploader from '@/components/ui/ImageUploader';
import useAuth from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Create Listing Content Component
 * Provides hosts with a comprehensive form to add new property listings.
 * Includes professional multi-image upload with reordering and cover photo selection.
 * Redirects to the host listings page on successful creation.
 */
function CreateListingContent() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, isHost } = useAuth();
  const toast = useToast();

  // Form state — holds all listing fields
  const [form, setForm] = useState({
    title: '',
    description: '',
    listingType: 'short_term',
    propertyType: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 1,
    bedsCount: 1,
    pricePerNight: '',
    pricePerMonth: '',
    cleaningFee: '0',
    securityDeposit: '0',
    streetAddress: '',
    city: '',
    subcity: '',
    instantBook: false,
    minNights: 1,
    cancellationPolicy: 'flexible',
    amenitiesInput: '',
    houseRules: '',
  });

  // Image state — tracks uploaded images array
  const [images, setImages] = useState([]);

  // UI state — loading, saving, errors
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Redirect if not authenticated or not a host
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isHost)) {
      router.push('/login?redirect=/host/listings/create');
    }
  }, [authLoading, isAuthenticated, isHost, router]);

  /**
   * Updates a form field and clears its validation error.
   *
   * @param {string} field - Field name
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
   * Checks required fields and pricing based on listing type.
   *
   * @returns {boolean} True if all required fields pass validation
   */
  function validateForm() {
    const errors = {};

    if (!form.title.trim() || form.title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters.';
    }
    if (!form.description.trim() || form.description.trim().length < 20) {
      errors.description = 'Description must be at least 20 characters.';
    }
    if (!form.streetAddress.trim()) {
      errors.streetAddress = 'Street address is required.';
    }
    if (!form.city.trim()) {
      errors.city = 'City is required.';
    }
    if (
      (form.listingType === 'short_term' || form.listingType === 'both') &&
      !form.pricePerNight
    ) {
      errors.pricePerNight = 'Price per night is required for short-term listings.';
    }
    if (
      (form.listingType === 'long_term' || form.listingType === 'both') &&
      !form.pricePerMonth
    ) {
      errors.pricePerMonth = 'Price per month is required for long-term listings.';
    }
    if (images.length === 0) {
      errors.images = 'Please upload at least one image.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Handles form submission.
   * Validates input, creates listing with images in a single atomic operation.
   * Redirects to the host listings page on success.
   *
   * @param {Event} e - Form submit event
   */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Parse amenities from comma-separated string
      const amenities = form.amenitiesInput
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
        .map((name) => ({ name }));

      // Prepare images array for atomic creation
      const imagesPayload = images.map((img, index) => ({
        url: img.url,
        sortOrder: index,
        isPrimary: img.is_primary || index === 0,
      }));

      // Prepare listing payload WITH images
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        listingType: form.listingType,
        propertyType: form.propertyType,
        bedrooms: parseInt(form.bedrooms, 10),
        bathrooms: parseInt(form.bathrooms, 10),
        maxGuests: parseInt(form.maxGuests, 10),
        bedsCount: parseInt(form.bedsCount, 10),
        pricePerNight: form.pricePerNight ? parseFloat(form.pricePerNight) : null,
        pricePerMonth: form.pricePerMonth ? parseFloat(form.pricePerMonth) : null,
        cleaningFee: parseFloat(form.cleaningFee) || 0,
        securityDeposit: parseFloat(form.securityDeposit) || 0,
        streetAddress: form.streetAddress.trim(),
        city: form.city.trim(),
        subcity: form.subcity.trim() || null,
        instantBook: form.instantBook,
        minNights: parseInt(form.minNights, 10),
        cancellationPolicy: form.cancellationPolicy,
        houseRules: form.houseRules.trim() || null,
        amenities: amenities.length > 0 ? amenities : undefined,
        images: imagesPayload,
      };

      // Create the listing with images in a single atomic operation
      await apiClient.post('/listings', payload);

      toast.success('Listing created successfully!');

      // Redirect to my listings after short delay
      setTimeout(() => {
        router.push('/host/my-listings');
      }, 1500);
    } catch (err) {
      console.error('Failed to create listing:', err);
      if (err instanceof ApiError) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError('Failed to create listing. Please try again.');
        toast.error('Failed to create listing. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Loading state while checking authentication
  if (authLoading) {
    return (
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '700px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              width: '200px',
              height: '40px',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>
        <div
          style={{
            height: '400px',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-lg)',
          }}
        />
      </div>
    );
  }

  // Not authenticated or not a host
  if (!isAuthenticated || !isHost) {
    return null;
  }

  return (
    <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '700px' }}>
      {/* Page Header with back navigation */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/host/my-listings"
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
          &larr; Back to My Listings
        </Link>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
          Create New Listing
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
          Add a new property to your portfolio and start earning.
        </p>
      </div>

      {/* Error Message */}
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
        {/* Property Images Section */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '1.25rem',
            }}
          >
            Property Images
          </h2>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: '1rem',
            }}
          >
            Upload high-quality photos of your property. The first image will be used as
            the cover photo. You can reorder images and change the cover photo after
            uploading.
          </p>
          <ImageUploader
            images={images}
            onImagesChange={setImages}
            folder="listings"
            maxImages={constants.MAX_IMAGES_PER_LISTING}
          />
          {fieldErrors.images && (
            <p
              style={{
                color: 'var(--color-error)',
                fontSize: 'var(--font-size-xs)',
                marginTop: '0.5rem',
              }}
            >
              {fieldErrors.images}
            </p>
          )}
        </Card>

        {/* Basic Information Section */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '1.25rem',
            }}
          >
            Basic Information
          </h2>
          <Input
            id="title"
            label="Listing Title"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            error={fieldErrors.title}
            placeholder="e.g., Modern Apartment in Bole with City View"
            required
          />
          <Input
            id="description"
            type="textarea"
            label="Description"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            error={fieldErrors.description}
            placeholder="Describe your property, its features, and what makes it special..."
            required
            rows={5}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              id="listingType"
              type="select"
              label="Listing Type"
              value={form.listingType}
              onChange={(e) => handleChange('listingType', e.target.value)}
              options={constants.LISTING_TYPES}
              required
            />
            <Input
              id="propertyType"
              type="select"
              label="Property Type"
              value={form.propertyType}
              onChange={(e) => handleChange('propertyType', e.target.value)}
              options={constants.PROPERTY_TYPES}
              required
            />
          </div>
        </Card>

        {/* Property Details Section */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '1.25rem',
            }}
          >
            Property Details
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              id="bedrooms"
              type="number"
              label="Bedrooms"
              value={form.bedrooms}
              onChange={(e) => handleChange('bedrooms', e.target.value)}
              min="0"
              required
            />
            <Input
              id="bathrooms"
              type="number"
              label="Bathrooms"
              value={form.bathrooms}
              onChange={(e) => handleChange('bathrooms', e.target.value)}
              min="1"
              required
            />
            <Input
              id="maxGuests"
              type="number"
              label="Maximum Guests"
              value={form.maxGuests}
              onChange={(e) => handleChange('maxGuests', e.target.value)}
              min="1"
              required
            />
            <Input
              id="bedsCount"
              type="number"
              label="Number of Beds"
              value={form.bedsCount}
              onChange={(e) => handleChange('bedsCount', e.target.value)}
              min="1"
              required
            />
          </div>
        </Card>

        {/* Pricing Section */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '1.25rem',
            }}
          >
            Pricing ({constants.CURRENCY_SYMBOL})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              id="pricePerNight"
              type="number"
              label="Price Per Night"
              value={form.pricePerNight}
              onChange={(e) => handleChange('pricePerNight', e.target.value)}
              error={fieldErrors.pricePerNight}
              placeholder="0"
              min="0"
            />
            <Input
              id="pricePerMonth"
              type="number"
              label="Price Per Month"
              value={form.pricePerMonth}
              onChange={(e) => handleChange('pricePerMonth', e.target.value)}
              error={fieldErrors.pricePerMonth}
              placeholder="0"
              min="0"
            />
            <Input
              id="cleaningFee"
              type="number"
              label="Cleaning Fee"
              value={form.cleaningFee}
              onChange={(e) => handleChange('cleaningFee', e.target.value)}
              placeholder="0"
              min="0"
            />
            <Input
              id="securityDeposit"
              type="number"
              label="Security Deposit"
              value={form.securityDeposit}
              onChange={(e) => handleChange('securityDeposit', e.target.value)}
              placeholder="0"
              min="0"
              helperText="Refundable after check-out"
            />
          </div>
        </Card>

        {/* Location Section */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '1.25rem',
            }}
          >
            Location
          </h2>
          <Input
            id="streetAddress"
            label="Street Address"
            value={form.streetAddress}
            onChange={(e) => handleChange('streetAddress', e.target.value)}
            error={fieldErrors.streetAddress}
            placeholder="e.g., 123 Bole Road"
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              id="city"
              label="City"
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
              error={fieldErrors.city}
              placeholder="e.g., Addis Ababa"
              required
            />
            <Input
              id="subcity"
              label="Subcity / Area"
              value={form.subcity}
              onChange={(e) => handleChange('subcity', e.target.value)}
              placeholder="e.g., Bole"
            />
          </div>
        </Card>

        {/* Amenities & Rules Section */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '1.25rem',
            }}
          >
            Amenities & Rules
          </h2>
          <Input
            id="amenitiesInput"
            label="Amenities"
            value={form.amenitiesInput}
            onChange={(e) => handleChange('amenitiesInput', e.target.value)}
            placeholder="WiFi, Kitchen, TV, Air Conditioning, Parking"
            helperText="Enter amenities separated by commas"
          />
          <Input
            id="houseRules"
            type="textarea"
            label="House Rules"
            value={form.houseRules}
            onChange={(e) => handleChange('houseRules', e.target.value)}
            placeholder="No smoking, No pets, Quiet hours after 10 PM..."
            rows={3}
          />
        </Card>

        {/* Booking Settings Section */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '1.25rem',
            }}
          >
            Booking Settings
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              id="minNights"
              type="number"
              label="Minimum Nights"
              value={form.minNights}
              onChange={(e) => handleChange('minNights', e.target.value)}
              min="1"
            />
            <Input
              id="cancellationPolicy"
              type="select"
              label="Cancellation Policy"
              value={form.cancellationPolicy}
              onChange={(e) => handleChange('cancellationPolicy', e.target.value)}
              options={constants.CANCELLATION_POLICIES}
            />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <input
                type="checkbox"
                checked={form.instantBook}
                onChange={(e) => handleChange('instantBook', e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              Enable Instant Book (guests can book without host approval)
            </label>
          </div>
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/host/my-listings" className="btn btn--outline" style={{ flex: 1 }}>
            Cancel
          </Link>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSaving}
            style={{ flex: 2 }}
          >
            Create Listing
          </Button>
        </div>
      </form>
    </main>
  );
}

/**
 * Create Listing Page — Default Export
 * Uses client-only mounting to prevent SSR prerender errors
 * with useToast during static page generation on Vercel.
 */
export default function CreateListingPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Return static shell during SSR to prevent useToast errors
  if (!isMounted) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '700px' }}>
          <p style={{ textAlign: 'center' }}>Loading...</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <CreateListingContent />
      <Footer />
    </>
  );
}