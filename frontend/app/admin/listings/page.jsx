// frontend/app/admin/listings/page.jsx
// Admin Listings Moderation Page — approve or reject pending property listings
// Displays listings awaiting approval with property details and action buttons
// Supports pagination for large volumes of pending listings
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Admin Listings Moderation Page
 * Allows administrators to review and approve or reject listings
 * submitted by hosts. Shows listing details, host information,
 * and provides moderation action buttons with optional notes.
 */
export default function AdminListingsPage() {
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState({ isOpen: false, listingId: null, listingTitle: '' });
  const [rejectNotes, setRejectNotes] = useState('');

  // Placeholder image for listings without photos
  const placeholderImage = '/images/placeholder-listing.svg';

  /**
   * Fetches paginated pending listings from the admin API.
   *
   * @param {number} [page=1] - Page number
   */
  const fetchPendingListings = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/admin/listings/pending?page=${page}&limit=10`);

      setListings(response?.data || response?.listings || []);
      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) setError('Admin access required.');
        else setError(err.message);
      } else {
        setError('Failed to load pending listings.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch listings on mount
  useEffect(() => {
    fetchPendingListings(1);
  }, [fetchPendingListings]);

  /**
   * Moderates a listing — approves or rejects.
   *
   * @param {string} listingId - Listing ID to moderate
   * @param {string} action - 'approve' or 'reject'
   * @param {string} [notes=''] - Optional review notes
   */
  async function handleModerate(listingId, action, notes = '') {
    setProcessingId(listingId);

    try {
      await apiClient.patch(`/admin/listings/${listingId}/moderate`, {
        action,
        notes: notes || null,
      });

      // Remove the moderated listing from the list
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setPagination((prev) => ({
        ...prev,
        totalItems: prev.totalItems - 1,
      }));

      // Close rejection modal if open
      if (rejectModal.isOpen) {
        setRejectModal({ isOpen: false, listingId: null, listingTitle: '' });
        setRejectNotes('');
      }
    } catch (err) {
      console.error(`Failed to ${action} listing:`, err.message);
    } finally {
      setProcessingId(null);
    }
  }

  /**
   * Opens the rejection modal with optional notes.
   *
   * @param {string} listingId - Listing ID
   * @param {string} listingTitle - Listing title for display
   */
  function openRejectModal(listingId, listingTitle) {
    setRejectModal({ isOpen: true, listingId, listingTitle });
    setRejectNotes('');
  }

  /**
   * Handles page changes.
   *
   * @param {number} page - New page number
   */
  function handlePageChange(page) {
    fetchPendingListings(page);
  }

  /**
   * Formats price display for a listing.
   *
   * @param {Object} listing - Listing data
   * @returns {string} Formatted price
   */
  function getPriceDisplay(listing) {
    if (listing.price_per_night) {
      return `${constants.CURRENCY_SYMBOL} ${Number(listing.price_per_night).toLocaleString()}/night`;
    }
    if (listing.price_per_month) {
      return `${constants.CURRENCY_SYMBOL} ${Number(listing.price_per_month).toLocaleString()}/month`;
    }
    return 'Price not set';
  }

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
            Moderate Listings
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {pagination.totalItems} {pagination.totalItems === 1 ? 'listing' : 'listings'} awaiting approval
          </p>
        </div>

        {/* Error State */}
        {error && (
          <Card padding="lg" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--color-error)' }}>
            <p style={{ color: 'var(--color-error)' }}>{error}</p>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} type="rect" height="150px" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          /* Empty State */
          <Card padding="lg">
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>
                No pending listings to review.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Listings Review List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
              {listings.map((listing) => (
                <Card key={listing.id} padding="lg">
                  {/* Listing Details */}
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: '150px',
                        height: '110px',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: 'var(--color-bg-secondary)',
                      }}
                    >
                      <img
                        src={listing.primary_image || listing.primaryImage || placeholderImage}
                        alt={listing.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = placeholderImage; }}
                      />
                    </div>

                    {/* Information */}
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.5rem' }}>
                        {listing.title}
                      </h3>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <Badge variant="info" size="sm">
                          {listing.listing_type === 'short_term' ? 'Short Stay' : listing.listing_type === 'long_term' ? 'Long Stay' : 'Both'}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {listing.property_type?.replace('_', ' ') || 'Property'}
                        </Badge>
                      </div>

                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                        {listing.street_address}, {listing.city}
                        {listing.subcity ? `, ${listing.subcity}` : ''}
                      </p>

                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
                        {listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''} &middot; {listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''} &middot; Up to {listing.max_guests} guests
                      </p>

                      <p style={{ fontWeight: 'var(--font-weight-bold)' }}>{getPriceDisplay(listing)}</p>
                    </div>

                    {/* Host Information */}
                    <div style={{ minWidth: '150px', fontSize: 'var(--font-size-sm)' }}>
                      <p style={{ color: 'var(--color-text-light)', marginBottom: '0.25rem' }}>Host</p>
                      <p style={{ fontWeight: 'var(--font-weight-medium)' }}>
                        {listing.host_first_name} {listing.host_last_name}
                      </p>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                        {listing.host_email}
                      </p>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      lineHeight: '1.6',
                      marginBottom: '1rem',
                      maxHeight: '60px',
                      overflow: 'hidden',
                    }}
                  >
                    {listing.description}
                  </p>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border-light)', paddingTop: '1rem' }}>
                    <Link
                      href={`/listings/${listing.id}`}
                      className="btn btn--ghost btn--sm"
                      target="_blank"
                    >
                      View Listing
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => openRejectModal(listing.id, listing.title)}
                      isLoading={processingId === listing.id}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleModerate(listing.id, 'approve')}
                      isLoading={processingId === listing.id}
                    >
                      Approve
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                showInfo
              />
            )}
          </>
        )}
      </main>

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => {
          setRejectModal({ isOpen: false, listingId: null, listingTitle: '' });
          setRejectNotes('');
        }}
        title="Reject Listing"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectModal({ isOpen: false, listingId: null, listingTitle: '' });
                setRejectNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleModerate(rejectModal.listingId, 'reject', rejectNotes)}
              isLoading={processingId === rejectModal.listingId}
            >
              Reject
            </Button>
          </div>
        }
      >
        <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
          You are rejecting: <strong>{rejectModal.listingTitle}</strong>
        </p>
        <div>
          <label
            htmlFor="reject-notes"
            style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '0.5rem' }}
          >
            Reason for rejection (optional)
          </label>
          <textarea
            id="reject-notes"
            className="input input--textarea"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Provide a reason for the host..."
            rows={3}
            style={{ width: '100%' }}
          />
        </div>
      </Modal>

      <Footer />
    </>
  );
}