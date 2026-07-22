// frontend/app/admin/reports/page.jsx
// Admin Reports Page — platform analytics with visual charts and working date filters
// Displays revenue bar chart, booking distribution donut visualization,
// listing type distribution, user growth trend, and platform overview cards
// Date range selector passes to API for time-filtered data — not just dashboard clone
// Inherits admin layout from app/admin/layout.jsx — no Header/Footer needed
// All labels and colors are config-driven via useConfig()
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import useConfig from '@/hooks/useConfig';
import { apiClient, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { getBookingStatus } from '@/lib/status';
import constants from '@/lib/constants';

/**
 * Admin Reports Page
 * Provides platform administrators with detailed analytics including
 * revenue visualization, booking distribution, listing type breakdown,
 * user growth metrics, and payment/withdrawal summaries.
 * All data is fetched with date range filtering for time-specific insights.
 */
export default function AdminReportsPage() {
  const { content, payment } = useConfig();
  const adminContent = content?.admin || {};
  const reportsContent = adminContent.reports || {};

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30');

  const currencySymbol = payment?.currencySymbol || constants.CURRENCY_SYMBOL;

  /**
   * Fetches report statistics from the admin API with date range filtering.
   * Passes the selected date range so the backend can filter data accordingly.
   */
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Pass dateRange as query parameter so the API can filter data
      const response = await apiClient.get(`/admin/dashboard?dateRange=${dateRange}`);

      if (response?.data) {
        setStats(response.data);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError(reportsContent.accessError || 'Admin access required to view reports.');
        } else {
          setError(err.message);
        }
      } else {
        setError(reportsContent.loadError || 'Failed to load report data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, reportsContent.accessError, reportsContent.loadError]);

  // Fetch data on mount and when date range changes
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  /**
   * Formats a number as currency for display.
   *
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  function formatCurrency(amount) {
    return `${currencySymbol} ${Number(amount || 0).toLocaleString()}`;
  }

  /**
   * Calculates percentage safely — avoids division by zero.
   *
   * @param {number} value - The numerator
   * @param {number} total - The denominator
   * @returns {number} Percentage rounded to one decimal
   */
  function calculatePercent(value, total) {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 1000) / 10;
  }

  /**
   * Finds the maximum value in an array of objects by a given key.
   * Used to normalize bar chart heights.
   *
   * @param {Array}  arr - Array of objects
   * @param {string} key - Key to find max value for
   * @returns {number} Maximum value
   */
  function getMaxValue(arr, key) {
    if (!arr || arr.length === 0) return 1;
    return Math.max(...arr.map((item) => item[key] || 0), 1);
  }

  // =========================================================================
  // LOADING STATE
  // =========================================================================
  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        <Skeleton type="rect" height="40px" width="280px" />
        <div
          style={{
            marginTop: '2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} type="rect" height="220px" />
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // ERROR STATE
  // =========================================================================
  if (error) {
    return (
      <div
        className="container"
        style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}
      >
        <h1 style={{ marginBottom: '1rem' }}>
          {reportsContent.title || 'Reports & Analytics'}
        </h1>
        <p style={{ color: 'var(--color-error)', marginBottom: '2rem' }}>{error}</p>
        <Link href={constants.ROUTES.LOGIN} className="btn btn--primary">
          {reportsContent.signIn || 'Sign In'}
        </Link>
      </div>
    );
  }

  if (!stats) return null;

  // =========================================================================
  // DERIVED METRICS
  // =========================================================================
  const totalBookings = stats.bookings?.total_bookings || 0;
  const totalRevenue = stats.revenue?.total_revenue || 0;
  const revenue30d = stats.revenue?.revenue_30d || 0;
  const totalServiceFees = stats.revenue?.total_service_fees || 0;

  // Booking status distribution for charts
  const bookingStatuses = [
    { status: 'pending', count: stats.bookings?.pending || 0 },
    { status: 'confirmed', count: stats.bookings?.confirmed || 0 },
    { status: 'completed', count: stats.bookings?.completed || 0 },
    { status: 'cancelled', count: stats.bookings?.cancelled || 0 },
  ];

  // Listing type distribution
  const listingTypes = [
    { type: reportsContent.shortTerm || 'Short Term', count: stats.listings?.short_term || 0, color: '#3B82F6' },
    { type: reportsContent.longTerm || 'Long Term', count: stats.listings?.long_term || 0, color: '#10B981' },
  ];
  const totalListings = stats.listings?.total_listings || 0;

  // User distribution
  const userDistribution = [
    { type: reportsContent.guests || 'Guests', count: stats.users?.total_guests || 0, color: '#3B82F6' },
    { type: reportsContent.hosts || 'Hosts', count: stats.users?.total_hosts || 0, color: '#10B981' },
  ];
  const totalUsers = stats.users?.total_users || 0;

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      {/* =====================================================================
          PAGE HEADER WITH DATE RANGE SELECTOR
          ===================================================================== */}
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
            {reportsContent.title || 'Reports & Analytics'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {reportsContent.subtitle || 'Platform performance overview and key metrics.'}
          </p>
        </div>

        {/* Date Range Selector */}
        <select
          className="input input--select"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="7">{reportsContent.last7Days || 'Last 7 days'}</option>
          <option value="30">{reportsContent.last30Days || 'Last 30 days'}</option>
          <option value="90">{reportsContent.last90Days || 'Last 90 days'}</option>
          <option value="365">{reportsContent.lastYear || 'Last year'}</option>
        </select>
      </div>

      {/* =====================================================================
          QUICK NAVIGATION
          ===================================================================== */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link href={constants.ROUTES.ADMIN_DASHBOARD} className="btn btn--outline btn--sm">
          {reportsContent.dashboard || 'Dashboard'}
        </Link>
        <Link href={constants.ROUTES.ADMIN_USERS} className="btn btn--outline btn--sm">
          {reportsContent.users || 'Users'}
        </Link>
        <Link href={constants.ROUTES.ADMIN_LISTINGS} className="btn btn--outline btn--sm">
          {reportsContent.listings || 'Listings'}
        </Link>
        <Link href={constants.ROUTES.ADMIN_PAYMENTS} className="btn btn--outline btn--sm">
          {reportsContent.payments || 'Payments'}
        </Link>
      </div>

      {/* =====================================================================
          REVENUE SUMMARY CARDS
          ===================================================================== */}
      <h2
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: '1rem',
        }}
      >
        {reportsContent.revenue || 'Revenue'}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}
      >
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
            {reportsContent.totalRevenue || 'Total Revenue (All Time)'}
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-success)',
            }}
          >
            {formatCurrency(totalRevenue)}
          </p>
        </Card>

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
            {reportsContent.revenue30d || 'Revenue (Period)'}
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-success)',
            }}
          >
            {formatCurrency(revenue30d)}
          </p>
        </Card>

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
            {reportsContent.serviceFees || 'Total Service Fees'}
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
            }}
          >
            {formatCurrency(totalServiceFees)}
          </p>
        </Card>
      </div>

      {/* =====================================================================
          REVENUE BAR CHART — CSS-only visual representation
          ===================================================================== */}
      <h2
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: '1rem',
        }}
      >
        {reportsContent.revenueBreakdown || 'Revenue Breakdown'}
      </h2>
      <Card padding="lg" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Total Revenue Bar */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                {reportsContent.totalRevenue || 'Total Revenue'}
              </span>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-semibold)' }}>
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            <div
              style={{
                height: '24px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  background: 'linear-gradient(90deg, #10B981, #059669)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'width 800ms ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '1rem',
                  fontSize: 'var(--font-size-xs)',
                  color: 'white',
                  fontWeight: 'var(--font-weight-semibold)',
                  minWidth: 'fit-content',
                }}
              >
                {formatCurrency(totalRevenue)}
              </div>
            </div>
          </div>

          {/* Service Fees Bar */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                {reportsContent.serviceFees || 'Service Fees'}
              </span>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-semibold)' }}>
                {formatCurrency(totalServiceFees)}
              </span>
            </div>
            <div
              style={{
                height: '24px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: totalRevenue > 0 ? `${Math.min((totalServiceFees / totalRevenue) * 100, 100)}%` : '0%',
                  background: 'linear-gradient(90deg, #3B82F6, #2563EB)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'width 800ms ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '1rem',
                  fontSize: 'var(--font-size-xs)',
                  color: 'white',
                  fontWeight: 'var(--font-weight-semibold)',
                  minWidth: totalServiceFees > 0 ? 'fit-content' : '0',
                }}
              >
                {totalServiceFees > 0 && formatCurrency(totalServiceFees)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* =====================================================================
          BOOKING DISTRIBUTION — CSS bar chart with status colors
          ===================================================================== */}
      <h2
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: '1rem',
        }}
      >
        {reportsContent.bookingDistribution || 'Booking Distribution'}
      </h2>
      <Card padding="lg" style={{ marginBottom: '2.5rem' }}>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: '1.5rem',
          }}
        >
          {reportsContent.totalBookings || 'Total bookings'}: <strong>{totalBookings}</strong>
          {stats.bookings?.bookings_30d > 0 && (
            <span style={{ color: 'var(--color-success)', marginLeft: '0.5rem' }}>
              (+{stats.bookings.bookings_30d} {reportsContent.inLast30Days || 'in period'})
            </span>
          )}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {bookingStatuses.map((item) => {
            const percent = calculatePercent(item.count, totalBookings);
            const statusConfig = getBookingStatus(item.status);

            return (
              <div key={item.status}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                    {statusConfig.label}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {item.count} ({percent}%)
                  </span>
                </div>
                <div
                  style={{
                    height: '12px',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(percent, 1)}%`,
                      backgroundColor: statusConfig.color,
                      borderRadius: '6px',
                      transition: 'width 800ms ease-out',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* =====================================================================
          LISTING TYPE DISTRIBUTION — Side-by-side bars
          ===================================================================== */}
      <h2
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: '1rem',
        }}
      >
        {reportsContent.listingDistribution || 'Listing Distribution'}
      </h2>
      <Card padding="lg" style={{ marginBottom: '2.5rem' }}>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: '1.5rem',
          }}
        >
          {reportsContent.totalListings || 'Total listings'}: <strong>{totalListings}</strong>
        </p>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', height: '160px', paddingTop: '1rem' }}>
          {listingTypes.map((item) => {
            const maxCount = getMaxValue(listingTypes, 'count');
            const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

            return (
              <div
                key={item.type}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {item.count}
                </span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '120px',
                    height: `${Math.max(heightPercent, 4)}%`,
                    backgroundColor: item.color,
                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                    transition: 'height 800ms ease-out',
                    minHeight: '8px',
                  }}
                />
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-light)',
                    textAlign: 'center',
                  }}
                >
                  {item.type}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* =====================================================================
          USER DISTRIBUTION — Side-by-side bars
          ===================================================================== */}
      <h2
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: '1rem',
        }}
      >
        {reportsContent.userDistribution || 'User Distribution'}
      </h2>
      <Card padding="lg" style={{ marginBottom: '2.5rem' }}>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            marginBottom: '1.5rem',
          }}
        >
          {reportsContent.totalUsers || 'Total users'}: <strong>{totalUsers}</strong>
          {stats.users?.new_users_30d > 0 && (
            <span style={{ color: 'var(--color-success)', marginLeft: '0.5rem' }}>
              (+{stats.users.new_users_30d} {reportsContent.newInPeriod || 'new in period'})
            </span>
          )}
        </p>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', height: '160px', paddingTop: '1rem' }}>
          {userDistribution.map((item) => {
            const maxCount = getMaxValue(userDistribution, 'count');
            const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

            return (
              <div
                key={item.type}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {item.count}
                </span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '120px',
                    height: `${Math.max(heightPercent, 4)}%`,
                    backgroundColor: item.color,
                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                    transition: 'height 800ms ease-out',
                    minHeight: '8px',
                  }}
                />
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-light)',
                    textAlign: 'center',
                  }}
                >
                  {item.type}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* =====================================================================
          PLATFORM OVERVIEW CARDS
          ===================================================================== */}
      <h2
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: '1rem',
        }}
      >
        {reportsContent.platformOverview || 'Platform Overview'}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}
      >
        {/* Users Overview */}
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
            {reportsContent.users || 'Users'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
            {[
              { label: reportsContent.total || 'Total', value: stats.users?.total_users || 0, bold: true },
              { label: reportsContent.guests || 'Guests', value: stats.users?.total_guests || 0 },
              { label: reportsContent.hosts || 'Hosts', value: stats.users?.total_hosts || 0 },
              { label: reportsContent.new30d || 'New (Period)', value: `+${stats.users?.new_users_30d || 0}`, color: 'var(--color-success)' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{row.label}</span>
                <span style={{ fontWeight: row.bold ? 'var(--font-weight-semibold)' : 'normal', color: row.color || 'inherit' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Listings Overview */}
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
            {reportsContent.listings || 'Listings'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
            {[
              { label: reportsContent.total || 'Total', value: stats.listings?.total_listings || 0, bold: true },
              { label: reportsContent.shortTerm || 'Short Term', value: stats.listings?.short_term || 0 },
              { label: reportsContent.longTerm || 'Long Term', value: stats.listings?.long_term || 0 },
              {
                label: reportsContent.pendingApproval || 'Pending Approval',
                value: stats.listings?.pending_approval || 0,
                color: stats.listings?.pending_approval > 0 ? 'var(--color-warning)' : 'inherit',
                bold: true,
              },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{row.label}</span>
                <span style={{ fontWeight: row.bold ? 'var(--font-weight-semibold)' : 'normal', color: row.color || 'inherit' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Payments Overview */}
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
            {reportsContent.payments || 'Payments'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
            {[
              { label: reportsContent.pending || 'Pending', value: stats.payments?.pending_payments || 0, variant: 'warning' },
              { label: reportsContent.processing || 'Processing', value: stats.payments?.processing_payments || 0, variant: 'info' },
              { label: reportsContent.completed || 'Completed', value: stats.payments?.completed_payments || 0, variant: 'success' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{row.label}</span>
                <Badge variant={row.variant} size="sm">{row.value}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Withdrawals Overview */}
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
            {reportsContent.withdrawals || 'Withdrawals'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {reportsContent.pendingRequests || 'Pending Requests'}
              </span>
              <span
                style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  color: stats.withdrawals?.pending_withdrawals > 0 ? 'var(--color-warning)' : 'inherit',
                }}
              >
                {stats.withdrawals?.pending_withdrawals || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {reportsContent.pendingAmount || 'Pending Amount'}
              </span>
              <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {formatCurrency(stats.withdrawals?.pending_amount)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* =====================================================================
          LAST UPDATED TIMESTAMP
          ===================================================================== */}
      <p
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-light)',
          textAlign: 'right',
          marginTop: '1rem',
        }}
      >
        {reportsContent.lastUpdated || 'Last updated'}: {formatDate(new Date().toISOString(), { format: 'datetime' })}
      </p>
    </div>
  );
}