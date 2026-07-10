// frontend/app/host/dashboard/page.jsx
// Host Dashboard — overview of listings, bookings, earnings, and quick actions
// Fetches aggregated statistics and recent activity for the authenticated host
// Author: Theron
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Host Dashboard Page
 * Provides hosts with a comprehensive overview of their property management.
 */
export default function HostDashboardPage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    totalEarnings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches all host dashboard data in parallel on component mount.
   */
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [userResponse, bookingsResponse] = await Promise.all([
          apiClient.get('/auth/me'),
          apiClient.get('/bookings/host?limit=10'),
        ]);

        if (userResponse?.data?.user) {
          setUser(userResponse.data.user);
        }

        const allBookings = bookingsResponse?.data || [];
        const pending = allBookings.filter((b) => b.status === 'pending').length;
        const confirmed = allBookings.filter((b) => b.status === 'confirmed').length;
        const completed = allBookings.filter((b) => b.status === 'completed');

        const earnings = completed.reduce(
          (sum, b) => sum + (parseFloat(b.total_amount) || 0),
          0
        );

        setStats({
          totalListings: bookingsResponse?.pagination?.totalListings || 0,
          activeListings: bookingsResponse?.pagination?.activeListings || 0,
          pendingBookings: pending,
          confirmedBookings: confirmed,
          totalEarnings: earnings,
        });
        setRecentBookings(allBookings.slice(0, 5));
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setError('Please log in to view your dashboard.');
          } else if (err.status === 403) {
            setError('You need a host account to access this page.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Unable to load dashboard data. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

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

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
          <Skeleton type="rect" height="40px" width="250px" />
          <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} type="rect" height="120px" />
            ))}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '1rem' }}>Host Dashboard</h1>
          <p style={{ color: 'var(--color-error)', marginBottom: '2rem' }}>{error}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href={constants.ROUTES.LOGIN} className="btn btn--primary">Sign In</Link>
            <Link href={constants.ROUTES.HOME} className="btn btn--outline">Go Home</Link>
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
        {/* Welcome Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
            Host Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
            Welcome back, {user?.firstName || 'Host'}! Manage your properties and bookings.
          </p>
        </div>

        {/* Statistics Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
              Total Listings
            </p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
              {stats.totalListings}
            </p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
              Pending Bookings
            </p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: stats.pendingBookings > 0 ? 'var(--color-warning)' : 'inherit' }}>
              {stats.pendingBookings}
            </p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
              Active Stays
            </p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
              {stats.confirmedBookings}
            </p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
              Total Earnings
            </p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)' }}>
              {constants.CURRENCY_SYMBOL} {stats.totalEarnings.toLocaleString()}
            </p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
              Active Listings
            </p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
              {stats.activeListings}
            </p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          <Link href={constants.ROUTES.HOST_LISTINGS_CREATE} className="btn btn--primary">
            Create New Listing
          </Link>
          <Link href="/host/my-listings" className="btn btn--outline">
            Manage Listings
          </Link>
          <Link href="/host/bookings" className="btn btn--outline">
            View All Bookings
          </Link>
          <Link href="/host/withdrawals" className="btn btn--outline">
            Withdraw Earnings
          </Link>
        </div>

        {/* Recent Booking Activity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)' }}>
              Recent Bookings
            </h2>
            <Link
              href="/host/bookings"
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-primary)' }}
            >
              View All
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <Card padding="lg">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                  No bookings yet. Create listings to start receiving bookings.
                </p>
                <Link href={constants.ROUTES.HOST_LISTINGS_CREATE} className="btn btn--primary btn--sm">
                  Create Your First Listing
                </Link>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentBookings.map((booking) => (
                <Card key={booking.id} padding="lg" hoverable>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.25rem' }}>
                        {booking.listing_title || 'Property'}
                      </p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        {booking.city || ''}
                      </p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                        {formatDate(booking.check_in_date)} — {formatDate(booking.check_out_date)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontWeight: 'var(--font-weight-bold)', marginBottom: '0.5rem' }}>
                        {constants.CURRENCY_SYMBOL} {Number(booking.total_amount).toLocaleString()}
                      </p>
                      <Badge variant={getStatusBadge(booking.status)} size="sm">
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  {booking.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-light)' }}>
                      <Button variant="primary" size="sm">
                        Confirm
                      </Button>
                      <Button variant="danger" size="sm">
                        Reject
                      </Button>
                    </div>
                  )}
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