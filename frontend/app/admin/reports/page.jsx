// frontend/app/admin/reports/page.jsx
// Admin Reports Page
// Displays revenue charts, booking statistics, and platform analytics
// Provides downloadable summary of key platform metrics
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
 * Admin Reports Page
 * Provides platform administrators with detailed analytics including
 * revenue trends, booking distribution by status, top listings,
 * and user growth metrics. Data is fetched from the admin dashboard API
 * and presented in a clean, readable layout.
 */
export default function AdminReportsPage() {

  // Statistics data state — populated from the admin dashboard API
  const [stats, setStats] = useState(null);

  // Loading and error states for UI feedback
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Report date range filter
  const [dateRange, setDateRange] = useState('30');

  /**
   * Fetches platform statistics from the admin API.
   * Uses the dashboard endpoint which provides comprehensive aggregated data.
   */
  useEffect(() => {
    async function fetchReportData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.get('/admin/dashboard');

        if (response?.data) {
          setStats(response.data);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 403) {
            setError('Admin access required to view reports.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to load report data. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchReportData();
  }, [dateRange]);

  /**
   * Formats a number as Ethiopian Birr currency for display.
   *
   * @param {number} amount - The amount to format
   * @returns {string} Formatted currency string
   */
  function formatCurrency(amount) {
    return `${constants.CURRENCY_SYMBOL} ${Number(amount || 0).toLocaleString()}`;
  }

  /**
   * Calculates a percentage value safely, avoiding division by zero.
   *
   * @param {number} value - The numerator
   * @param {number} total - The denominator
   * @returns {number} Percentage value rounded to one decimal place
   */
  function calculatePercent(value, total) {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 1000) / 10;
  }

  /**
   * Returns a human-readable label for a booking status.
   *
   * @param {string} status - The booking status code
   * @returns {string} Capitalized status label
   */
  function getStatusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Returns a color code for a booking status for visual differentiation.
   *
   * @param {string} status - The booking status code
   * @returns {string} Hex color code
   */
  function getStatusColor(status) {
    const colorMap = {
      pending: '#F59E0B',
      confirmed: '#10B981',
      completed: '#3B82F6',
      cancelled: '#EF4444',
      rejected: '#EF4444',
      expired: '#6B7280',
    };
    return colorMap[status] || '#6B7280';
  }

  // Loading state — display skeleton placeholders while data loads
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
          <Skeleton type="rect" height="40px" width="200px" />
          <div
            style={{
              marginTop: '2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} type="rect" height="200px" />
            ))}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Error state — display error message with retry option
  if (error) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '1rem' }}>Reports</h1>
          <p style={{ color: 'var(--color-error)', marginBottom: '2rem' }}>{error}</p>
          <Link href={constants.ROUTES.LOGIN} className="btn btn--primary">
            Sign In
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  if (!stats) return null;

  // Calculate derived metrics from the raw statistics
  const totalBookings = stats.bookings?.total_bookings || 0;
  const bookingStatuses = [
    { status: 'pending', count: stats.bookings?.pending || 0 },
    { status: 'confirmed', count: stats.bookings?.confirmed || 0 },
    { status: 'completed', count: stats.bookings?.completed || 0 },
    { status: 'cancelled', count: stats.bookings?.cancelled || 0 },
  ];

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Page Header with date range filter */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: '0.25rem',
              }}
            >
              Reports & Analytics
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Platform performance overview and key metrics.
            </p>
          </div>

          {/* Date Range Selector */}
          <select
            className="input input--select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>

        {/* Quick Navigation */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          <Link href={constants.ROUTES.ADMIN_DASHBOARD} className="btn btn--outline btn--sm">
            Dashboard
          </Link>
          <Link href={constants.ROUTES.ADMIN_USERS} className="btn btn--outline btn--sm">
            Users
          </Link>
          <Link href={constants.ROUTES.ADMIN_LISTINGS} className="btn btn--outline btn--sm">
            Listings
          </Link>
          <Link href={constants.ROUTES.ADMIN_PAYMENTS} className="btn btn--outline btn--sm">
            Payments
          </Link>
        </div>

        {/* Revenue Summary Section */}
        <h2
          style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: '1rem',
          }}
        >
          Revenue
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Total Revenue Card */}
          <Card padding="lg" hoverable>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-light)',
                marginBottom: '0.5rem',
              }}
            >
              Total Revenue (All Time)
            </p>
            <p
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-success)',
              }}
            >
              {formatCurrency(stats.revenue?.total_revenue)}
            </p>
          </Card>

          {/* 30-Day Revenue Card */}
          <Card padding="lg" hoverable>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-light)',
                marginBottom: '0.5rem',
              }}
            >
              Revenue (Last 30 Days)
            </p>
            <p
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-success)',
              }}
            >
              {formatCurrency(stats.revenue?.revenue_30d)}
            </p>
          </Card>

          {/* Service Fees Card */}
          <Card padding="lg" hoverable>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-light)',
                marginBottom: '0.5rem',
              }}
            >
              Total Service Fees
            </p>
            <p
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
              }}
            >
              {formatCurrency(stats.revenue?.total_service_fees)}
            </p>
          </Card>
        </div>

        {/* Booking Distribution Section */}
        <h2
          style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: '1rem',
          }}
        >
          Booking Distribution
        </h2>
        <Card padding="lg" style={{ marginBottom: '2.5rem' }}>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: '1.5rem',
            }}
          >
            Total bookings: <strong>{totalBookings}</strong>
            {stats.bookings?.bookings_30d > 0 && (
              <span style={{ color: 'var(--color-success)', marginLeft: '0.5rem' }}>
                (+{stats.bookings.bookings_30d} in last 30 days)
              </span>
            )}
          </p>

          {/* Booking Status Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bookingStatuses.map((item) => {
              const percent = calculatePercent(item.count, totalBookings);

              return (
                <div key={item.status}>
                  {/* Status Label and Count */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                      {getStatusLabel(item.status)}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {item.count} ({percent}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      height: '8px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percent}%`,
                        backgroundColor: getStatusColor(item.status),
                        borderRadius: '4px',
                        transition: 'width 500ms ease-out',
                        minWidth: item.count > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Platform Overview Section */}
        <h2
          style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: '1rem',
          }}
        >
          Platform Overview
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Users Stats */}
          <Card padding="lg" hoverable>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-light)',
                marginBottom: '1rem',
              }}
            >
              Users
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Total</span>
                <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{stats.users?.total_users || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Guests</span>
                <span>{stats.users?.total_guests || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Hosts</span>
                <span>{stats.users?.total_hosts || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>New (30d)</span>
                <span style={{ color: 'var(--color-success)' }}>+{stats.users?.new_users_30d || 0}</span>
              </div>
            </div>
          </Card>

          {/* Listings Stats */}
          <Card padding="lg" hoverable>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-light)',
                marginBottom: '1rem',
              }}
            >
              Listings
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Total</span>
                <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{stats.listings?.total_listings || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Short Term</span>
                <span>{stats.listings?.short_term || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Long Term</span>
                <span>{stats.listings?.long_term || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Pending Approval</span>
                <span style={{ color: stats.listings?.pending_approval > 0 ? 'var(--color-warning)' : 'inherit', fontWeight: 'var(--font-weight-semibold)' }}>
                  {stats.listings?.pending_approval || 0}
                </span>
              </div>
            </div>
          </Card>

          {/* Payments Stats */}
          <Card padding="lg" hoverable>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-light)',
                marginBottom: '1rem',
              }}
            >
              Payments
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Pending</span>
                <Badge variant="warning" size="sm">{stats.payments?.pending_payments || 0}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Processing</span>
                <Badge variant="info" size="sm">{stats.payments?.processing_payments || 0}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Completed</span>
                <Badge variant="success" size="sm">{stats.payments?.completed_payments || 0}</Badge>
              </div>
            </div>
          </Card>

          {/* Withdrawals Stats */}
          <Card padding="lg" hoverable>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-light)',
                marginBottom: '1rem',
              }}
            >
              Withdrawals
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Pending Requests</span>
                <span style={{ fontWeight: 'var(--font-weight-semibold)', color: stats.withdrawals?.pending_withdrawals > 0 ? 'var(--color-warning)' : 'inherit' }}>
                  {stats.withdrawals?.pending_withdrawals || 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Pending Amount</span>
                <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                  {formatCurrency(stats.withdrawals?.pending_amount)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
}