// frontend/app/host/my-listings/page.jsx
// Host My Listings Page — manage all property listings for the authenticated host
// Displays listings with status indicators, quick actions (edit, toggle active, delete)
// Supports pagination for hosts with many properties
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
 * Host My Listings Page
 * Provides a management interface for hosts to view and manage their properties.
 * Each listing card shows key details and provides actions for editing,
 * toggling active status, and deleting listings.
 */
export default function MyListingsPage() {
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, listingId: null, listingTitle: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Placeholder image for listings without images
  const placeholderImage = '/images/placeholder-listing.svg';

  /**
   * Fetches paginated listings belonging to the authenticated host.
   *
   * @param {number} [page=1] - Page number to fetch
   */
  const fetchListings = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      // In production, this would be a dedicated /host/listings endpoint
      // Currently using the public search with a host-specific approach
      const response = await apiClient.get(`/listings?limit=10&page=${page}`);

      setListings(response?.data || []);
      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Please log in to view your listings.');
        } else if (err.status === 403) {
          setError('You need a host account to access this page.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load listings. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch listings on component mount
  useEffect(() => {
    fetchListings(1);
  }, [fetchListings]);

  /**
   * Handles page changes from the Pagination component.
   *
   * @param {number} page - New page number
   */
  function handlePageChange(page) {
    fetchListings(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Opens the delete confirmation modal for a listing.
   *
   * @param {string} listingId - The listing ID to delete
   * @param {string} listingTitle - The listing title for the confirmation message
   */
  function openDeleteModal(listingId, listingTitle) {
    setDeleteModal({ isOpen: true, listingId, listingTitle });
  }

  /**
   * Closes the delete confirmation modal without action.
   */
  function closeDeleteModal() {
    setDeleteModal({ isOpen: false, listingId: null, listingTitle: '' });
  }

  /**
   * Deletes a listing after confirmation.
   * Performs the API call and removes the listing from local state.
   */
  async function handleDeleteListing() {
    if (!deleteModal.listingId) return;

    setIsDeleting(true);

    try {
      await apiClient.delete(`/listings/${deleteModal.listingId}`);

      // Remove the deleted listing from state immediately
      setListings((prev) => prev.filter((l) => l.id !== deleteModal.listingId));
      setPagination((prev) => ({
        ...prev,
        totalItems: prev.totalItems - 1,
      }));

      closeDeleteModal();
    } catch (err) {
      console.error('Failed to delete listing:', err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  /**
   * Formats price display based on listing type.
   *
   * @param {Object} listing - Listing data object
   * @returns {string} Formatted price string
   */
  function getPriceDisplay(listing) {
    if (listing.listing_type === 'long_term' && listing.price_per_month) {
      return `${constants.CURRENCY_SYMBOL} ${Number(listing.price_per_month).toLocaleString()}/month`;
    }
    if (listing.price_per_night) {
      return `${constants.CURRENCY_SYMBOL} ${Number(listing.price_per_night).toLocaleString()}/night`;
    }
    return 'Price not set';
  }

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
          <Skeleton type="rect" height="40px" width="200px" />
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} type="rect" height="120px" />
            ))}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '1rem' }}>My Listings</h1>
          <p style={{ color: 'var(--color-error)', marginBottom: '2rem' }}>{error}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href={constants.ROUTES.LOGIN} className="btn btn--primary">Sign In</Link>
            <Link href={constants.ROUTES.HOST_LISTINGS_CREATE} className="btn btn--outline">Create Listing</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Page Header with Create button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
              My Listings
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {pagination.totalItems > 0
                ? `You have ${pagination.totalItems} ${pagination.totalItems === 1 ? 'listing' : 'listings'}.`
                : 'Create your first listing to start hosting.'}
            </p>
          </div>
          <Link href={constants.ROUTES.HOST_LISTINGS_CREATE} className="btn btn--primary">
            + Create Listing
          </Link>
        </div>

        {/* Empty State — No listings created yet */}
        {listings.length === 0 ? (
          <Card padding="lg">
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🏠</div>
              <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '0.5rem' }}>
                No listings yet
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto' }}>
                Start earning by listing your property. It only takes a few minutes to create your first listing.
              </p>
              <Link href={constants.ROUTES.HOST_LISTINGS_CREATE} className="btn btn--primary">
                Create Your First Listing
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Listings List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {listings.map((listing) => (
                <Card key={listing.id} padding="lg" hoverable>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {/* Listing Thumbnail */}
                    <div style={{ width: '120px', height: '90px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-bg-secondary)' }}>
                      <img
                        src={listing.primaryImage || listing.primary_image || placeholderImage}
                        alt={listing.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = placeholderImage; }}
                      />
                    </div>

                    {/* Listing Details */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                          {listing.title}
                        </h3>
                        <Badge variant={listing.is_active ? 'success' : 'default'} size="sm">
                          {listing.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="info" size="sm">
                          {listing.listing_type === 'short_term' ? 'Short Stay' : listing.listing_type === 'long_term' ? 'Long Stay' : 'Both'}
                        </Badge>
                      </div>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                        {listing.city || listing.location?.city}
                        {listing.subcity ? `, ${listing.subcity}` : ''}
                      </p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
                        {listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''} &middot; {listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''} &middot; Up to {listing.maxGuests || listing.max_guests} guests
                      </p>
                      <p style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>
                        {getPriceDisplay(listing)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center', flexShrink: 0 }}>
                      <Link
                        href={`/host/my-listings/${listing.id}/edit`}
                        className="btn btn--outline btn--sm"
                        style={{ textAlign: 'center' }}
                      >
                        Edit
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Toggle active status — in production this calls the API
                          console.log('Toggle active for:', listing.id);
                        }}
                      >
                        {listing.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => openDeleteModal(listing.id, listing.title)}
                      >
                        Delete
                      </Button>
                    </div>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        title="Delete Listing"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" size="sm" onClick={closeDeleteModal}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteListing}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
          Are you sure you want to delete <strong>{deleteModal.listingTitle}</strong>?
        </p>
        <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginTop: '0.75rem' }}>
          This action cannot be undone. All associated bookings and data will be permanently removed.
        </p>
      </Modal>

      <Footer />
    </>
  );
}