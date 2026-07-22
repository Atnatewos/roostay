// frontend/app/admin/listings/[id]/page.jsx
// Admin Listing Detail Page
// Displays full listing information for admin review before moderation
// Shows property details, host info, images, amenities, and moderation actions
// Inherits admin layout from app/admin/layout.jsx — no Header/Footer needed
// All labels are config-driven via useConfig()
// Author: Theron

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import ImageGallery from '@/components/listing/ImageGallery';
import AmenitiesList from '@/components/listing/AmenitiesList';
import Modal from '@/components/ui/Modal';
import useConfig from '@/hooks/useConfig';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Admin Listing Detail Page
 * Provides administrators with a complete view of a listing for moderation purposes.
 * Displays all property details, host information, and provides approve/reject actions
 * with optional review notes for the host.
 */
export default function AdminListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id;

  const { content, payment } = useConfig();
  const adminContent = content?.admin || {};
  const detailContent = adminContent.listingDetail || {};

  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const currencySymbol = payment?.currencySymbol || constants.CURRENCY_SYMBOL;

  /**
   * Fetches the full listing details from the API.
   */
  useEffect(() => {
    async function fetchListing() {
      try {
        const response = await apiClient.get(`/listings/${listingId}`);

        if (response?.data?.listing) {
          setListing(response.data.listing);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404) setError(detailContent.notFound || 'Listing not found.');
          else setError(err.message);
        } else {
          setError(detailContent.loadError || 'Failed to load listing details.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (listingId) {
      fetchListing();
    }
  }, [listingId, detailContent.notFound, detailContent.loadError]);

  /**
   * Approves or rejects the listing.
   *
   * @param {string} action  - 'approve' or 'reject'
   * @param {string} [notes] - Optional review notes
   */
  async function handleModerate(action, notes = '') {
    setIsProcessing(true);

    try {
      await apiClient.patch(`/admin/listings/${listingId}/moderate`, {
        action,
        notes: notes || null,
      });

      router.push(constants.ROUTES.ADMIN_LISTINGS);
    } catch (err) {
      console.error(`Failed to ${action} listing:`, err.message);
      setIsProcessing(false);
    }
  }

  /**
   * Returns a badge variant for the listing's approval status.
   *
   * @param {string} status - Approval status
   * @returns {string} CSS badge variant
   */
  function getApprovalBadge(status) {
    const map = { pending: 'warning', approved: 'success', rejected: 'danger' };
    return map[status] || 'default';
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

  // Loading state
  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        <Skeleton type="rect" height="400px" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1rem' }}>{detailContent.title || 'Listing'}</h1>
        <p style={{ color: 'var(--color-error)', marginBottom: '2rem' }}>{error}</p>
        <Link href={constants.ROUTES.ADMIN_LISTINGS} className="btn btn--primary">
          {detailContent.backToListings || 'Back to Listings'}
        </Link>
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '900px' }}>
      {/* Back Navigation */}
      <Link
        href={constants.ROUTES.ADMIN_LISTINGS}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          textDecoration: 'none',
          marginBottom: '1.5rem',
        }}
      >
        &larr; {detailContent.backToListings || 'Back to Listings'}
      </Link>

      {/* Listing Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.5rem' }}>
            {listing.title}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge variant={getApprovalBadge(listing.approval_status || 'pending')} size="sm">
              {listing.approval_status
                ? listing.approval_status.charAt(0).toUpperCase() + listing.approval_status.slice(1)
                : (detailContent.pending || 'Pending')}
            </Badge>
            <Badge variant="info" size="sm">
              {listing.listingType === 'short_term' ? (detailContent.shortStay || 'Short Stay') : listing.listingType === 'long_term' ? (detailContent.longStay || 'Long Stay') : (detailContent.both || 'Both')}
            </Badge>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
              {detailContent.created || 'Created'} {formatDate(listing.createdAt || listing.created_at)}
            </span>
          </div>
        </div>

        {/* Moderation Actions — only for pending listings */}
        {listing.approval_status === 'pending' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="danger" size="md" onClick={() => setRejectModalOpen(true)} isLoading={isProcessing}>
              {detailContent.reject || 'Reject'}
            </Button>
            <Button variant="primary" size="md" onClick={() => handleModerate('approve')} isLoading={isProcessing}>
              {detailContent.approve || 'Approve'}
            </Button>
          </div>
        )}
      </div>

      {/* Image Gallery */}
      <div style={{ marginBottom: '2rem' }}>
        <ImageGallery images={listing.images || []} alt={listing.title} />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card padding="lg">
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
              {detailContent.description || 'Description'}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
              {listing.description}
            </p>
          </Card>

          <Card padding="lg">
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
              {detailContent.propertyDetails || 'Property Details'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', display: 'block' }}>{detailContent.type || 'Type'}</span>
                <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{listing.propertyType?.replace('_', ' ') || 'N/A'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', display: 'block' }}>{detailContent.bedrooms || 'Bedrooms'}</span>
                <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{listing.bedrooms}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', display: 'block' }}>{detailContent.bathrooms || 'Bathrooms'}</span>
                <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{listing.bathrooms}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', display: 'block' }}>{detailContent.maxGuests || 'Max Guests'}</span>
                <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{listing.maxGuests}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', display: 'block' }}>{detailContent.beds || 'Beds'}</span>
                <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{listing.bedsCount}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', display: 'block' }}>{detailContent.instantBook || 'Instant Book'}</span>
                <Badge variant={listing.instantBook ? 'success' : 'default'} size="sm">
                  {listing.instantBook ? (detailContent.yes || 'Yes') : (detailContent.no || 'No')}
                </Badge>
              </div>
            </div>
          </Card>

          {listing.amenities && listing.amenities.length > 0 && (
            <Card padding="lg">
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
                {detailContent.amenities || 'Amenities'}
              </h2>
              <AmenitiesList amenities={listing.amenities} />
            </Card>
          )}

          {listing.houseRules && (
            <Card padding="lg">
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
                {detailContent.houseRules || 'House Rules'}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                {listing.houseRules}
              </p>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card padding="lg">
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
              {detailContent.pricing || 'Pricing'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: 'var(--font-size-sm)' }}>
              {listing.pricePerNight && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{detailContent.perNight || 'Per Night'}</span>
                  <span style={{ fontWeight: 'var(--font-weight-bold)' }}>{currencySymbol} {Number(listing.pricePerNight).toLocaleString()}</span>
                </div>
              )}
              {listing.pricePerMonth && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{detailContent.perMonth || 'Per Month'}</span>
                  <span style={{ fontWeight: 'var(--font-weight-bold)' }}>{currencySymbol} {Number(listing.pricePerMonth).toLocaleString()}</span>
                </div>
              )}
              {listing.cleaningFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{detailContent.cleaningFee || 'Cleaning Fee'}</span>
                  <span>{currencySymbol} {Number(listing.cleaningFee).toLocaleString()}</span>
                </div>
              )}
              {listing.securityDeposit > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{detailContent.securityDeposit || 'Security Deposit'}</span>
                  <span>{currencySymbol} {Number(listing.securityDeposit).toLocaleString()}</span>
                </div>
              )}
            </div>
          </Card>

          <Card padding="lg">
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
              {detailContent.location || 'Location'}
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: '0.25rem' }}>
              {listing.location?.streetAddress || (detailContent.addressNotProvided || 'Address not provided')}
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              {listing.location?.city}{listing.location?.subcity ? `, ${listing.location.subcity}` : ''}
            </p>
          </Card>

          <Card padding="lg">
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
              {detailContent.host || 'Host'}
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '0.25rem' }}>
              {listing.host?.firstName} {listing.host?.lastName}
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              {detailContent.hostSince || 'Host since'}: {formatDate(listing.createdAt || listing.created_at)}
            </p>
          </Card>

          <Card padding="lg">
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
              {detailContent.settings || 'Settings'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{detailContent.minNights || 'Min Nights'}</span>
                <span>{listing.minNights}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{detailContent.checkIn || 'Check-in'}</span>
                <span>{listing.checkInTime || '14:00'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{detailContent.checkOut || 'Check-out'}</span>
                <span>{listing.checkOutTime || '11:00'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{detailContent.cancellation || 'Cancellation'}</span>
                <span style={{ textTransform: 'capitalize' }}>{listing.cancellationPolicy || 'Flexible'}</span>
              </div>
            </div>
          </Card>

          <Link
            href={`/listings/${listing.id}`}
            target="_blank"
            className="btn btn--outline"
            style={{ textAlign: 'center' }}
          >
            {detailContent.viewLiveListing || 'View Live Listing'}
          </Link>
        </div>
      </div>

      {/* Rejection Notes Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={detailContent.rejectTitle || 'Reject Listing'}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" size="sm" onClick={() => { setRejectModalOpen(false); setRejectNotes(''); }}>
              {detailContent.cancel || 'Cancel'}
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleModerate('reject', rejectNotes)} isLoading={isProcessing}>
              {detailContent.rejectListing || 'Reject Listing'}
            </Button>
          </div>
        }
      >
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          {detailContent.rejectMessage || 'Provide a reason for rejection. This will be shown to the host.'}
        </p>
        <textarea
          className="input input--textarea"
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
          placeholder={detailContent.rejectPlaceholder || 'e.g., Insufficient description, inaccurate pricing, inappropriate content...'}
          rows={4}
          style={{ width: '100%' }}
        />
      </Modal>
    </div>
  );
}