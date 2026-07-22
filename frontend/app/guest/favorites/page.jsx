// frontend/app/guest/favorites/page.jsx
// Guest Favorites Page — displays all saved/favorited property listings
// Uses the shared ListingCard component for 100% visual consistency
// Author: Theron
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ListingCard from '@/components/listing/ListingCard';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Guest Favorites Page
 * Displays a responsive grid of favorited listings.
 * Leverages the shared ListingCard component to ensure identical 
 * styling, spacing, and behavior across the entire platform.
 */
export default function GuestFavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches paginated favorites from the API.
   * Uses useCallback to enable clean retry functionality on error.
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
   * Handles the favorite toggle event triggered by the ListingCard component.
   * Optimistically removes the listing from the local state when unfavorited
   * to provide instant, responsive feedback to the user.
   *
   * @param {string} listingId - The ID of the listing that was toggled
   * @param {boolean} isNowFavorited - The new favorite state (false means it was removed)
   */
  function handleFavoriteToggle(listingId, isNowFavorited) {
    if (!isNowFavorited) {
      // Optimistically remove from UI immediately
      setFavorites((prev) => prev.filter((fav) => fav.id !== listingId));
      setPagination((prev) => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
      }));
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

        {/* Error State */}
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

        {/* Loading State */}
        {isLoading ? (
          <div className="premium-listings-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="premium-skeleton">
                <div className="premium-skeleton__image" />
                <div className="premium-skeleton__content">
                  <div className="premium-skeleton__line premium-skeleton__line--title" />
                  <div className="premium-skeleton__line" />
                  <div className="premium-skeleton__line premium-skeleton__line--short" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 && !error ? (
          /* Empty State */
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
            {/* Favorites Grid — Uses shared premium grid for perfect consistency */}
            <div className="premium-listings-grid" style={{ marginBottom: '2rem' }}>
              {favorites.map((favorite) => (
                <ListingCard 
                  key={favorite.id} 
                  listing={favorite} 
                  showFavorite={true}
                  onToggle={handleFavoriteToggle}
                />
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
      <Footer />
    </>
  );
}