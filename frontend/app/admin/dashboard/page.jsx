// frontend/app/admin/dashboard/page.jsx
// Admin Dashboard — system-wide statistics, recent activity, and management overview
// Displays key metrics for users, listings, bookings, payments, and withdrawals
// Provides quick access to all administrative functions
// Author: Theron

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Admin Dashboard Page
 * Central hub for platform administrators to monitor system health.
 * Fetches aggregated statistics across users, listings, bookings,
 * payments, and withdrawals. Displays recent platform activity.
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState({ users: [], bookings: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches all dashboard statistics from the admin API endpoint.
   * Aggregates data for the statistics cards and recent activity feed.
   */
  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        const response = await apiClient.get('/admin/dashboard');

        if (response?.data) {
          const data = response.data;

          // Map API response to component state
          setStats({
            totalUsers: data.users?.total_users || 0,
            newUsers30d: data.users?.new_users_30d || 0,
            totalHosts: data.users?.total_hosts || 0,
            totalGuests: data.users?.total_guests || 0,

            totalListings: data.listings?.total_listings || 0,
            pendingApproval: data.listings?.pending_approval || 0,
            shortTerm: data.listings?.short_term || 0,
            longTerm: data.listings?.long_term || 0,

            totalBookings: data.bookings?.total_bookings || 0,
            pendingBookings: data.bookings?.pending || 0,
            confirmedBookings: data.bookings?.confirmed || 0,
            completedBookings: data.bookings?.completed || 0,
            bookings30d: data.bookings?.bookings_30d || 0,

            totalRevenue: data.revenue?.total_revenue || 0,
            revenue30d: data.revenue?.revenue_30d || 0,
            totalServiceFees: data.revenue?.total_service_fees || 0,

            pendingPayments: data.payments?.pending_payments || 0,
            processingPayments: data.payments?.processing_payments || 0,
            completedPayments: data.payments?.completed_payments || 0,

            pendingWithdrawals: data.withdrawals?.pending_withdrawals || 0,
            pendingWithdrawalAmount: data.withdrawals?.pending_amount || 0,
          });

          // Set recent activity from the response
          if (data.recentActivity) {
            setRecentActivity(data.recentActivity);
          }
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setError('Please log in as an administrator.');
          } else if (err.status === 403) {
            setError('You do not have admin privileges.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to load dashboard data. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardStats();
  }, []);

  /**
   * Formats a number as Ethiopian Birr currency for display.
   *
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  function formatCurrency(amount) {
    return `${constants.CURRENCY_SYMBOL} ${Number(amount || 0).toLocaleString()}`;
  }

  /**
   * Formats a date string for display in the recent activity feed.
   *
   * @param {string} dateStr - ISO date string
   * @returns {string} Relative time description
   */
  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
          <Skeleton type="rect" height="40px" width="280px" />
          <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <h1 style={{ marginBottom: '1rem' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--color-error)', marginBottom: '2rem' }}>{error}</p>
          <Link href={constants.ROUTES.LOGIN} className="btn btn--primary">Sign In</Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Platform overview and system management.
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          <Link href={constants.ROUTES.ADMIN_USERS} className="btn btn--outline btn--sm">Manage Users</Link>
          <Link href={constants.ROUTES.ADMIN_LISTINGS} className="btn btn--outline btn--sm">Moderate Listings</Link>
          <Link href={constants.ROUTES.ADMIN_PAYMENTS} className="btn btn--outline btn--sm">Verify Payments</Link>
          <Link href={constants.ROUTES.ADMIN_WITHDRAWALS} className="btn btn--outline btn--sm">Process Withdrawals</Link>
        </div>

        {/* Section: User Statistics */}
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
          Users
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Total Users</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>{stats.totalUsers}</p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', marginTop: '0.5rem' }}>+{stats.newUsers30d} in last 30 days</p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Hosts</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>{stats.totalHosts}</p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Guests</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>{stats.totalGuests}</p>
          </Card>
        </div>

        {/* Section: Listing Statistics */}
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
          Listings
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Total Listings</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>{stats.totalListings}</p>
          </Card>
          <Card padding="lg" hoverable style={{ borderLeft: stats.pendingApproval > 0 ? '3px solid var(--color-warning)' : 'none' }}>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Pending Approval</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: stats.pendingApproval > 0 ? 'var(--color-warning)' : 'inherit' }}>{stats.pendingApproval}</p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Short Term</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>{stats.shortTerm}</p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Long Term</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>{stats.longTerm}</p>
          </Card>
        </div>

        {/* Section: Booking Statistics */}
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
          Bookings
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Total Bookings</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>{stats.totalBookings}</p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', marginTop: '0.5rem' }}>+{stats.bookings30d} in last 30 days</p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Pending</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>{stats.pendingBookings}</p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Confirmed</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>{stats.confirmedBookings}</p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Completed</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>{stats.completedBookings}</p>
          </Card>
        </div>

        {/* Section: Revenue & Payments */}
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
          Revenue & Payments
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Total Revenue</p>
            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)' }}>{formatCurrency(stats.totalRevenue)}</p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginTop: '0.5rem' }}>{formatCurrency(stats.revenue30d)} in last 30 days</p>
          </Card>
          <Card padding="lg" hoverable>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Service Fees</p>
            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{formatCurrency(stats.totalServiceFees)}</p>
          </Card>
          <Card padding="lg" hoverable style={{ borderLeft: stats.pendingPayments > 0 ? '3px solid var(--color-warning)' : 'none' }}>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Pending Payments</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: stats.pendingPayments > 0 ? 'var(--color-warning)' : 'inherit' }}>{stats.pendingPayments}</p>
          </Card>
          <Card padding="lg" hoverable style={{ borderLeft: stats.pendingWithdrawals > 0 ? '3px solid var(--color-warning)' : 'none' }}>
            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Pending Withdrawals</p>
            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: stats.pendingWithdrawals > 0 ? 'var(--color-warning)' : 'inherit' }}>{stats.pendingWithdrawals}</p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginTop: '0.5rem' }}>{formatCurrency(stats.pendingWithdrawalAmount)} pending</p>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
}