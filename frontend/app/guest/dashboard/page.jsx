// frontend/app/guest/dashboard/page.jsx
// Guest Dashboard — overview of bookings, favorites, and quick actions
// Fetches user profile and recent bookings from the API
// Author: Theron

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { apiClient, getStoredUser } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Guest Dashboard Page
 * Displays a welcome message, booking statistics, recent bookings,
 * and quick action links for the authenticated guest user.
 * Fetches data client-side to ensure fresh information on every visit.
 */
export default function GuestDashboardPage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalBookings: 0, activeBookings: 0, favorites: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches all dashboard data in parallel on component mount.
   * Retrieves user profile, booking statistics, and recent booking history.
   * Gracefully handles API errors with user-friendly messages.
   */
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Retrieve stored user from localStorage for immediate display
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }

        // Fetch bookings in parallel with user data for better performance
        const [userResponse, bookingsResponse, favoritesResponse] = await Promise.all([
          apiClient.get('/auth/me'),
          apiClient.get('/bookings/guest?limit=5'),
          apiClient.get('/favorites?limit=1'),
        ]);

        if (userResponse?.data?.user) {
          setUser(userResponse.data.user);
        }

        const bookings = bookingsResponse?.data || [];
        const activeBookings = bookings.filter(
          (b) => b.status === 'pending' || b.status === 'confirmed'
        );

        setRecentBookings(bookings.slice(0, 5));
        setStats({
          totalBookings: bookingsResponse?.pagination?.totalItems || bookings.length,
          activeBookings: activeBookings.length,
          favorites: favoritesResponse?.pagination?.totalItems || 0,
        });
      } catch (err) {
        // Handle authentication errors — user may need to log in
        if (err.status === 401) {
          setError('Please log in to view your dashboard.');
        } else {
          setError('Unable to load dashboard data. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  /**
   * Returns the appropriate status badge variant for a booking status.
   * Maps booking statuses to color-coded badge variants for visual clarity.
   *
   * @param {string} status - The booking status
   * @returns {string} Badge variant name
   */
  function getStatusBadge(status) {
    const variantMap = {
      pending: 'warning',
      confirmed: 'success',
      cancelled: 'danger',
      completed: 'info',
      rejected: 'danger',
      expired: 'default',
    };
    return variantMap[status] || 'default';
  }

  /**
   * Formats an ISO date string into a human-readable format.
   *
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date (e.g., "Jul 14, 2026")
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Loading state — display skeleton placeholders while data loads
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
          <Skeleton type="rect" height="40px" width="300px" />
          <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} type="rect" height="120px" />
            ))}
          </div>
          <div style={{ marginTop: '2rem' }}>
            <Skeleton type="card" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Error state — display error message with recovery options
  if (error) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '1rem' }}>Dashboard</h1>
          <p style={{ color: 'var(--color-error)', marginBottom: '2rem' }}>{error}</p>
          <Link href={constants.ROUTES.LOGIN} className="btn btn--primary">
            Sign In
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
            Welcome back, {user?.firstName || 'Guest'}!
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
            Here's an overview of your stays and activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
              Total Bookings
            </p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
              {stats.totalBookings}
            </p>
          </Card>

          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
              Active Stays
            </p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
              {stats.activeBookings}
            </p>
          </Card>

          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
              Saved Favorites
            </p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
              {stats.favorites}
            </p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          <Link href={constants.ROUTES.LISTINGS} className="btn btn--primary">
            Browse Listings
          </Link>
          <Link href={constants.ROUTES.GUEST_FAVORITES} className="btn btn--outline">
            View Favorites
          </Link>
          <Link href={constants.ROUTES.GUEST_PROFILE} className="btn btn--outline">
            Edit Profile
          </Link>
        </div>

        {/* Recent Bookings */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)' }}>
              Recent Bookings
            </h2>
            <Link
              href={constants.ROUTES.GUEST_BOOKINGS}
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-primary)' }}
            >
              View All
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <Card padding="lg">
              <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No bookings yet. Start exploring listings to book your first stay!
              </p>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <Link href={constants.ROUTES.LISTINGS} className="btn btn--primary btn--sm">
                  Browse Listings
                </Link>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentBookings.map((booking) => (
                <Card key={booking.id} padding="lg" hoverable clickable>
                  <Link
                    href={`/guest/bookings/${booking.id}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
                  >
                    <div>
                      <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.25rem' }}>
                        {booking.listing_title || 'Property'}
                      </p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        {formatDate(booking.check_in_date)} — {formatDate(booking.check_out_date)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                        {constants.CURRENCY_SYMBOL} {Number(booking.total_amount).toLocaleString()}
                      </span>
                      <Badge variant={getStatusBadge(booking.status)} size="sm">
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}