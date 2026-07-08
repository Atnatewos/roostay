// frontend/app/host/my-listings/create/page.jsx
// Create Listing Page — multi-section form for hosts to create new property listings
// Handles all listing fields including pricing, location, amenities, and house rules
// Validates input on submission and redirects to the listing on success
// Author: Theron

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Create Listing Page
 * Provides a comprehensive form for hosts to create new property listings.
 * Organized into logical sections: Basic Info, Property Details, Pricing,
 * Location, Amenities, and Rules. Validates all required fields before submission.
 */
export default function CreateListingPage() {
  const router = useRouter();

  // Form state — organized by section for clarity
  const [form, setForm] = useState({
    // Basic Information
    title: '',
    description: '',
    listingType: 'short_term',
    propertyType: 'apartment',

    // Property Details
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 1,
    bedsCount: 1,

    // Pricing
    pricePerNight: '',
    pricePerMonth: '',
    cleaningFee: '0',
    securityDeposit: '0',

    // Location
    streetAddress: '',
    city: '',
    subcity: '',

    // Booking Settings
    instantBook: false,
    minNights: 1,
    cancellationPolicy: 'flexible',

    // Amenities (comma-separated for simplicity, parsed on submit)
    amenitiesInput: '',

    // House Rules
    houseRules: '',
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  /**
   * Updates a form field and clears its error.
   *
   * @param {string} field - Field name to update
   * @param {*} value - New field value
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
   * Validates all required form fields before submission.
   *
   * @returns {boolean} True if the form passes all validation checks
   */
  function validateForm() {
    const errors = {};

    // Required text fields validation
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

    // Pricing validation based on listing type
    if ((form.listingType === 'short_term' || form.listingType === 'both') && !form.pricePerNight) {
      errors.pricePerNight = 'Price per night is required for short-term listings.';
    }

    if ((form.listingType === 'long_term' || form.listingType === 'both') && !form.pricePerMonth) {
      errors.pricePerMonth = 'Price per month is required for long-term listings.';
    }

    // Numeric field validation
    if (form.maxGuests < 1) errors.maxGuests = 'Must accommodate at least 1 guest.';
    if (form.bedrooms < 0) errors.bedrooms = 'Cannot be negative.';
    if (form.bathrooms < 1) errors.bathrooms = 'Must have at least 1 bathroom.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Handles form submission.
   * Validates all fields, constructs the API payload, and sends the request.
   * On success, redirects to the host listings page.
   *
   * @param {Event} e - Form submit event
   */
  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Parse amenities from comma-separated input
      const amenities = form.amenitiesInput
        ? form.amenitiesInput.split(',').map((a) => ({
            name: a.trim(),
            category: 'general',
          }))
        : [];

      // Construct the API payload
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
        amenities,
        houseRules: form.houseRules.trim() || null,
      };

      const response = await apiClient.post('/listings', payload);

      // Redirect to the host listings page on success
      if (response?.data?.listing?.id) {
        router.push('/host/my-listings');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create listing. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '700px' }}>
        {/* Page Header */}
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
        </div>

        {/* Error Banner */}
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
          {/* Section 1: Basic Information */}
          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>
              Basic Information
            </h2>

            <Input
              id="title"
              label="Listing Title"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={fieldErrors.title}
              required
              placeholder="e.g., Modern Apartment in Bole with City View"
            />

            <Input
              id="description"
              type="textarea"
              label="Description"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={fieldErrors.description}
              required
              placeholder="Describe your property in detail. Highlight unique features, nearby attractions, and house rules..."
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

          {/* Section 2: Property Details */}
          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>
              Property Details
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                id="bedrooms"
                type="number"
                label="Bedrooms"
                value={form.bedrooms}
                onChange={(e) => handleChange('bedrooms', e.target.value)}
                error={fieldErrors.bedrooms}
                required
              />
              <Input
                id="bathrooms"
                type="number"
                label="Bathrooms"
                value={form.bathrooms}
                onChange={(e) => handleChange('bathrooms', e.target.value)}
                error={fieldErrors.bathrooms}
                required
              />
              <Input
                id="maxGuests"
                type="number"
                label="Maximum Guests"
                value={form.maxGuests}
                onChange={(e) => handleChange('maxGuests', e.target.value)}
                error={fieldErrors.maxGuests}
                required
              />
              <Input
                id="bedsCount"
                type="number"
                label="Number of Beds"
                value={form.bedsCount}
                onChange={(e) => handleChange('bedsCount', e.target.value)}
                required
              />
            </div>
          </Card>

          {/* Section 3: Pricing */}
          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>
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
                placeholder="3500"
                helperText={form.listingType === 'long_term' ? 'Optional for long-term only' : 'Required'}
              />
              <Input
                id="pricePerMonth"
                type="number"
                label="Price Per Month"
                value={form.pricePerMonth}
                onChange={(e) => handleChange('pricePerMonth', e.target.value)}
                error={fieldErrors.pricePerMonth}
                placeholder="85000"
                helperText={form.listingType === 'short_term' ? 'Optional for short-term only' : 'Required'}
              />
              <Input
                id="cleaningFee"
                type="number"
                label="Cleaning Fee"
                value={form.cleaningFee}
                onChange={(e) => handleChange('cleaningFee', e.target.value)}
                placeholder="500"
              />
              <Input
                id="securityDeposit"
                type="number"
                label="Security Deposit"
                value={form.securityDeposit}
                onChange={(e) => handleChange('securityDeposit', e.target.value)}
                placeholder="5000"
                helperText="Refundable after check-out"
              />
            </div>
          </Card>

          {/* Section 4: Location */}
          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>
              Location
            </h2>

            <Input
              id="streetAddress"
              label="Street Address"
              value={form.streetAddress}
              onChange={(e) => handleChange('streetAddress', e.target.value)}
              error={fieldErrors.streetAddress}
              required
              placeholder="Bole Road, Near Edna Mall"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                id="city"
                type="select"
                label="City"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                error={fieldErrors.city}
                required
                options={[
                  { value: '', label: 'Select a city' },
                  ...constants.CITIES.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Input
                id="subcity"
                label="Subcity / Area"
                value={form.subcity}
                onChange={(e) => handleChange('subcity', e.target.value)}
                placeholder="Bole, Kirkos, Yeka..."
              />
            </div>
          </Card>

          {/* Section 5: Amenities & Rules */}
          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>
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
              placeholder="No smoking indoors. Quiet hours after 10 PM. No parties or events."
            />
          </Card>

          {/* Section 6: Booking Settings */}
          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>
              Booking Settings
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                id="minNights"
                type="number"
                label="Minimum Nights"
                value={form.minNights}
                onChange={(e) => handleChange('minNights', e.target.value)}
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                <input
                  type="checkbox"
                  checked={form.instantBook}
                  onChange={(e) => handleChange('instantBook', e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Enable Instant Book — Guests can book without host approval
              </label>
            </div>
          </Card>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/host/my-listings" className="btn btn--outline" style={{ flex: 1 }}>
              Cancel
            </Link>
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting} style={{ flex: 2 }}>
              Create Listing
            </Button>
          </div>
        </form>
      </main>

      <Footer />
    </>
  );
}