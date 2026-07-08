// frontend/app/guest/favorites/page.jsx
// Guest Favorites Page — displays all saved/favorited property listings
// Fetches favorited listings with pagination from the API
// Each card links to the listing detail and supports removing favorites
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
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Guest Favorites Page
 * Displays a responsive grid of favorited listings with property images,
 * pricing, location, and an option to remove individual favorites.
 * Supports pagination for users with many saved listings.
 */
export default function GuestFavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  /**
   * Fetches paginated favorites from the API.
   * Uses useCallback to enable retry functionality on error.
   *
   * @param {number} [page=1] - Page number to fetch
   */
  const fetchFavorites = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/favorites?page=${page}&limit=12`);

      setFavorites(response?.data || []);
      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        // Handle authentication errors specifically
        if (err.status === 401) {
          setError('Please log in to view your favorites.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load favorites. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch favorites on initial mount
  useEffect(() => {
    fetchFavorites(1);
  }, [fetchFavorites]);

  /**
   * Removes a listing from favorites with optimistic UI update.
   * Removes the card immediately for a responsive feel, then confirms with the API.
   *
   * @param {string} listingId - The listing ID to remove from favorites
   * @param {Event} e - Click event to prevent navigation
   */
  async function handleRemoveFavorite(listingId, e) {
    // Prevent the click from navigating to the listing detail
    e.preventDefault();
    e.stopPropagation();

    setRemovingId(listingId);

    try {
      // Call the toggle endpoint which handles both add and remove
      await apiClient.post(`/favorites/${listingId}`);

      // Remove the listing from the local state immediately for responsive UX
      setFavorites((prev) => prev.filter((fav) => fav.id !== listingId));
      setPagination((prev) => ({
        ...prev,
        totalItems: prev.totalItems - 1,
      }));
    } catch (err) {
      // Silently fail — the optimistic update already removed the card
      // In a production app, you would revert the optimistic update here
      console.error('Failed to remove favorite:', err.message);
    } finally {
      setRemovingId(null);
    }
  }

  /**
   * Handles page changes from the Pagination component.
   * Scrolls to top of page for better user experience.
   *
   * @param {number} page - New page number
   */
  function handlePageChange(page) {
    fetchFavorites(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Generates the price display string based on listing type.
   *
   * @param {Object} favorite - Favorite listing object
   * @returns {string} Formatted price display
   */
  function getPriceDisplay(favorite) {
    if (favorite.listing_type === 'long_term' && favorite.price_per_month) {
      return `${constants.CURRENCY_SYMBOL} ${Number(favorite.price_per_month).toLocaleString()}/month`;
    }
    if (favorite.price_per_night) {
      return `${constants.CURRENCY_SYMBOL} ${Number(favorite.price_per_night).toLocaleString()}/night`;
    }
    return 'Price on request';
  }

  // Placeholder image path for listings without images
  const placeholderImage = '/images/placeholder-listing.svg';

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.5rem' }}>
            My Favorites
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {pagination.totalItems > 0
              ? `You have ${pagination.totalItems} saved ${pagination.totalItems === 1 ? 'listing' : 'listings'}.`
              : 'Save listings you love to find them quickly later.'}
          </p>
        </div>

        {/* Error State — Displayed when API call fails */}
        {error && (
          <Card padding="lg" style={{ marginBottom: '2rem', borderLeft: '3px solid var(--color-error)' }}>
            <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" size="sm" onClick={() => fetchFavorites(1)}>
                Try Again
              </Button>
              {error.includes('log in') && (
                <Link href={constants.ROUTES.LOGIN} className="btn btn--primary btn--sm">
                  Sign In
                </Link>
              )}
            </div>
          </Card>
        )}

        {/* Loading State — Skeleton cards while data loads */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} type="card" />
            ))}
          </div>
        ) : favorites.length === 0 && !error ? (
          /* Empty State — Shown when user has no favorites */
          <Card padding="lg">
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>
                &#9825;
              </div>
              <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '0.5rem' }}>
                No favorites yet
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto' }}>
                Tap the heart icon on any listing to save it here. Start exploring to find your perfect stay.
              </p>
              <Link href={constants.ROUTES.LISTINGS} className="btn btn--primary">
                Browse Listings
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Favorites Grid — Responsive card layout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}
            >
              {favorites.map((favorite) => (
                <div key={favorite.favorite_id || favorite.id} className="listing-card">
                  <Link
                    href={`/listings/${favorite.id}`}
                    className="listing-card__link"
                    style={{ position: 'relative' }}
                  >
                    {/* Property Image with fallback */}
                    <div className="listing-card__image-wrapper">
                      <img
                        src={favorite.primary_image || placeholderImage}
                        alt={favorite.title}
                        className="listing-card__image"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = placeholderImage;
                        }}
                      />

                      {/* Listing Type Badge */}
                      <div className="listing-card__badges">
                        <Badge
                          variant={favorite.listing_type === 'short_term' ? 'primary' : 'info'}
                          size="sm"
                        >
                          {favorite.listing_type === 'short_term' ? 'Short Stay' : 'Long Stay'}
                        </Badge>
                      </div>

                      {/* Remove Favorite Button */}
                      <button
                        className="listing-card__favorite"
                        onClick={(e) => handleRemoveFavorite(favorite.id, e)}
                        disabled={removingId === favorite.id}
                        aria-label="Remove from favorites"
                        style={{
                          opacity: 1,
                          color: 'var(--color-primary)',
                          transform: 'none',
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="none">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    </div>

                    {/* Listing Details */}
                    <div className="listing-card__content">
                      <h3
                        className="listing-card__title"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {favorite.title}
                      </h3>

                      <p className="listing-card__location">
                        {favorite.city || 'Location not specified'}
                      </p>

                      {/* Property Specs */}
                      <div className="listing-card__details">
                        <span>
                          {favorite.bedrooms} bed{favorite.bedrooms !== 1 ? 's' : ''}
                        </span>
                        <span className="listing-card__detail-separator">&middot;</span>
                        <span>
                          {favorite.bathrooms} bath{favorite.bathrooms !== 1 ? 's' : ''}
                        </span>
                        <span className="listing-card__detail-separator">&middot;</span>
                        <span>Up to {favorite.max_guests} guests</span>
                      </div>

                      {/* Price and Date Saved */}
                      <div className="listing-card__footer">
                        <span className="listing-card__price">
                          <strong>{getPriceDisplay(favorite)}</strong>
                        </span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                          Saved {new Date(favorite.favorited_at || favorite.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            {/* Pagination — Only shown when multiple pages exist */}
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

      <Footer />
    </>
  );
}