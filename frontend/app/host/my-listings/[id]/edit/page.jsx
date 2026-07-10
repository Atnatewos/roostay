// frontend/app/host/my-listings/[id]/edit/page.jsx
// Edit Listing Page with Image Management
// Pre-populated form allowing hosts to update existing property listings and photos
// Author: Theron
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import ImageUploader from '@/components/ui/ImageUploader';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id;

  const [form, setForm] = useState({
    title: '', description: '', listingType: 'short_term', propertyType: 'apartment',
    bedrooms: 1, bathrooms: 1, maxGuests: 1, bedsCount: 1,
    pricePerNight: '', pricePerMonth: '', cleaningFee: '0', securityDeposit: '0',
    streetAddress: '', city: '', subcity: '',
    instantBook: false, minNights: 1, cancellationPolicy: 'flexible',
    amenitiesInput: '', houseRules: '',
  });

  const [images, setImages] = useState([]);
  const [isImagesDirty, setIsImagesDirty] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    async function fetchListing() {
      try {
        const response = await apiClient.get(`/listings/${listingId}`);
        if (response?.data?.listing) {
          const listing = response.data.listing;
          setForm({
            title: listing.title || '',
            description: listing.description || '',
            listingType: listing.listingType || 'short_term',
            propertyType: listing.propertyType || 'apartment',
            bedrooms: listing.bedrooms || 1,
            bathrooms: listing.bathrooms || 1,
            maxGuests: listing.maxGuests || 1,
            bedsCount: listing.bedsCount || 1,
            pricePerNight: listing.pricePerNight ? String(listing.pricePerNight) : '',
            pricePerMonth: listing.pricePerMonth ? String(listing.pricePerMonth) : '',
            cleaningFee: listing.cleaningFee ? String(listing.cleaningFee) : '0',
            securityDeposit: listing.securityDeposit ? String(listing.securityDeposit) : '0',
            streetAddress: listing.location?.streetAddress || '',
            city: listing.location?.city || '',
            subcity: listing.location?.subcity || '',
            instantBook: listing.instantBook || false,
            minNights: listing.minNights || 1,
            cancellationPolicy: listing.cancellationPolicy || 'flexible',
            amenitiesInput: listing.amenities ? listing.amenities.map(a => a.amenity_name).join(', ') : '',
            houseRules: listing.houseRules || '',
          });
          setImages(listing.images || []);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load listing data.');
      } finally {
        setIsLoading(false);
      }
    }
    if (listingId) fetchListing();
  }, [listingId]);

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const u = { ...prev }; delete u[field]; return u; });
    }
  }

  function validateForm() {
    const errors = {};
    if (!form.title.trim() || form.title.trim().length < 5) errors.title = 'Title must be at least 5 characters.';
    if (!form.description.trim() || form.description.trim().length < 20) errors.description = 'Description must be at least 20 characters.';
    if (!form.streetAddress.trim()) errors.streetAddress = 'Street address is required.';
    if (!form.city.trim()) errors.city = 'City is required.';
    if ((form.listingType === 'short_term' || form.listingType === 'both') && !form.pricePerNight) errors.pricePerNight = 'Price per night is required.';
    if ((form.listingType === 'long_term' || form.listingType === 'both') && !form.pricePerMonth) errors.pricePerMonth = 'Price per month is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        title: form.title.trim(), description: form.description.trim(),
        listingType: form.listingType, propertyType: form.propertyType,
        bedrooms: parseInt(form.bedrooms, 10), bathrooms: parseInt(form.bathrooms, 10),
        maxGuests: parseInt(form.maxGuests, 10), bedsCount: parseInt(form.bedsCount, 10),
        pricePerNight: form.pricePerNight ? parseFloat(form.pricePerNight) : null,
        pricePerMonth: form.pricePerMonth ? parseFloat(form.pricePerMonth) : null,
        cleaningFee: parseFloat(form.cleaningFee) || 0,
        securityDeposit: parseFloat(form.securityDeposit) || 0,
        streetAddress: form.streetAddress.trim(), city: form.city.trim(),
        subcity: form.subcity.trim() || null,
        instantBook: form.instantBook, minNights: parseInt(form.minNights, 10),
        cancellationPolicy: form.cancellationPolicy,
        houseRules: form.houseRules.trim() || null,
      };

      await apiClient.put(`/listings/${listingId}`, payload);

      // Handle image updates if changed
      if (isImagesDirty) {
        const imagePayload = images.map((img, index) => ({
          url: img.url,
          sort_order: index,
          is_primary: img.is_primary,
        }));
        await apiClient.post(`/listings/${listingId}/images`, { images: imagePayload });
      }

      setSuccess(true);
      setTimeout(() => router.push('/host/my-listings'), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update listing.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '800px' }}>
          <Skeleton type="rect" height="40px" width="200px" />
          <div style={{ marginTop: '2rem' }}><Skeleton type="rect" height="400px" /></div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '800px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/host/my-listings" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: '1rem' }}>
            &larr; Back to My Listings
          </Link>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>Edit Listing</h1>
        </div>

        {success && <div style={{ padding: '1rem', backgroundColor: 'var(--color-success-light)', color: '#065F46', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>Listing updated successfully! Redirecting...</div>}
        {error && <div style={{ padding: '1rem', backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>Property Images</h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Upload high-quality photos of your property. The first image will be used as the cover photo.
            </p>
            <ImageUploader 
              existingImages={images} 
              onImagesChange={({ images: newImages, isDirty }) => {
                setImages(newImages);
                setIsImagesDirty(isDirty);
              }}
            />
          </Card>

          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>Basic Information</h2>
            <Input id="title" label="Listing Title" value={form.title} onChange={(e) => handleChange('title', e.target.value)} error={fieldErrors.title} required />
            <Input id="description" type="textarea" label="Description" value={form.description} onChange={(e) => handleChange('description', e.target.value)} error={fieldErrors.description} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input id="listingType" type="select" label="Listing Type" value={form.listingType} onChange={(e) => handleChange('listingType', e.target.value)} options={constants.LISTING_TYPES} required />
              <Input id="propertyType" type="select" label="Property Type" value={form.propertyType} onChange={(e) => handleChange('propertyType', e.target.value)} options={constants.PROPERTY_TYPES} required />
            </div>
          </Card>

          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>Property Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input id="bedrooms" type="number" label="Bedrooms" value={form.bedrooms} onChange={(e) => handleChange('bedrooms', e.target.value)} required />
              <Input id="bathrooms" type="number" label="Bathrooms" value={form.bathrooms} onChange={(e) => handleChange('bathrooms', e.target.value)} required />
              <Input id="maxGuests" type="number" label="Maximum Guests" value={form.maxGuests} onChange={(e) => handleChange('maxGuests', e.target.value)} required />
              <Input id="bedsCount" type="number" label="Number of Beds" value={form.bedsCount} onChange={(e) => handleChange('bedsCount', e.target.value)} required />
            </div>
          </Card>

          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>Pricing ({constants.CURRENCY_SYMBOL})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input id="pricePerNight" type="number" label="Price Per Night" value={form.pricePerNight} onChange={(e) => handleChange('pricePerNight', e.target.value)} error={fieldErrors.pricePerNight} />
              <Input id="pricePerMonth" type="number" label="Price Per Month" value={form.pricePerMonth} onChange={(e) => handleChange('pricePerMonth', e.target.value)} error={fieldErrors.pricePerMonth} />
              <Input id="cleaningFee" type="number" label="Cleaning Fee" value={form.cleaningFee} onChange={(e) => handleChange('cleaningFee', e.target.value)} />
              <Input id="securityDeposit" type="number" label="Security Deposit" value={form.securityDeposit} onChange={(e) => handleChange('securityDeposit', e.target.value)} />
            </div>
          </Card>

          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>Location</h2>
            <Input id="streetAddress" label="Street Address" value={form.streetAddress} onChange={(e) => handleChange('streetAddress', e.target.value)} error={fieldErrors.streetAddress} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input id="city" label="City" value={form.city} onChange={(e) => handleChange('city', e.target.value)} error={fieldErrors.city} required />
              <Input id="subcity" label="Subcity / Area" value={form.subcity} onChange={(e) => handleChange('subcity', e.target.value)} />
            </div>
          </Card>

          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>Amenities & Rules</h2>
            <Input id="amenitiesInput" label="Amenities" value={form.amenitiesInput} onChange={(e) => handleChange('amenitiesInput', e.target.value)} placeholder="WiFi, Kitchen, TV" helperText="Enter amenities separated by commas" />
            <Input id="houseRules" type="textarea" label="House Rules" value={form.houseRules} onChange={(e) => handleChange('houseRules', e.target.value)} />
          </Card>

          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>Booking Settings</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input id="minNights" type="number" label="Minimum Nights" value={form.minNights} onChange={(e) => handleChange('minNights', e.target.value)} />
              <Input id="cancellationPolicy" type="select" label="Cancellation Policy" value={form.cancellationPolicy} onChange={(e) => handleChange('cancellationPolicy', e.target.value)} options={constants.CANCELLATION_POLICIES} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                <input type="checkbox" checked={form.instantBook} onChange={(e) => handleChange('instantBook', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                Enable Instant Book
              </label>
            </div>
          </Card>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/host/my-listings" className="btn btn--outline" style={{ flex: 1 }}>Cancel</Link>
            <Button type="submit" variant="primary" fullWidth isLoading={isSaving} style={{ flex: 2 }}>Save Changes</Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}