// frontend/app/admin/reports/page.jsx
// Admin Reports Page
// Displays revenue charts, booking statistics, and platform analytics
// Inherits admin layout from app/admin/layout.jsx — no Header/Footer needed
// All labels are config-driven via useConfig()
// Author: Theron

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import useConfig from '@/hooks/useConfig';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Admin Reports Page
 * Provides platform administrators with detailed analytics including
 * revenue trends, booking distribution by status, and user growth metrics.
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
          if (err.status === 403) setError(reportsContent.accessError || 'Admin access required to view reports.');
          else setError(err.message);
        } else {
          setError(reportsContent.loadError || 'Failed to load report data. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchReportData();
  }, [dateRange, reportsContent.accessError, reportsContent.loadError]);

  function formatCurrency(amount) {
    return `${currencySymbol} ${Number(amount || 0).toLocaleString()}`;
  }

  function calculatePercent(value, total) {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 1000) / 10;
  }

  function getStatusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function getStatusColor(status) {
    const colorMap = { pending: '#F59E0B', confirmed: '#10B981', completed: '#3B82F6', cancelled: '#EF4444', rejected: '#EF4444', expired: '#6B7280' };
    return colorMap[status] || '#6B7280';
  }

  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        <Skeleton type="rect" height="40px" width="200px" />
        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3, 4].map((i) => (<Skeleton key={i} type="rect" height="200px" />))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1rem' }}>{reportsContent.title || 'Reports'}</h1>
        <p style={{ color: 'var(--color-error)', marginBottom: '2rem' }}>{error}</p>
        <Link href={constants.ROUTES.LOGIN} className="btn btn--primary">{reportsContent.signIn || 'Sign In'}</Link>
      </div>
    );
  }

  if (!stats) return null;

  const totalBookings = stats.bookings?.total_bookings || 0;
  const bookingStatuses = [
    { status: 'pending', count: stats.bookings?.pending || 0 },
    { status: 'confirmed', count: stats.bookings?.confirmed || 0 },
    { status: 'completed', count: stats.bookings?.completed || 0 },
    { status: 'cancelled', count: stats.bookings?.cancelled || 0 },
  ];

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
            {reportsContent.title || 'Reports & Analytics'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {reportsContent.subtitle || 'Platform performance overview and key metrics.'}
          </p>
        </div>

        <select className="input input--select" value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ width: '160px' }}>
          <option value="7">{reportsContent.last7Days || 'Last 7 days'}</option>
          <option value="30">{reportsContent.last30Days || 'Last 30 days'}</option>
          <option value="90">{reportsContent.last90Days || 'Last 90 days'}</option>
          <option value="365">{reportsContent.lastYear || 'Last year'}</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link href={constants.ROUTES.ADMIN_DASHBOARD} className="btn btn--outline btn--sm">{reportsContent.dashboard || 'Dashboard'}</Link>
        <Link href={constants.ROUTES.ADMIN_USERS} className="btn btn--outline btn--sm">{reportsContent.users || 'Users'}</Link>
        <Link href={constants.ROUTES.ADMIN_LISTINGS} className="btn btn--outline btn--sm">{reportsContent.listings || 'Listings'}</Link>
        <Link href={constants.ROUTES.ADMIN_PAYMENTS} className="btn btn--outline btn--sm">{reportsContent.payments || 'Payments'}</Link>
      </div>

      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>{reportsContent.revenue || 'Revenue'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <Card padding="lg" hoverable>
          <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
            {reportsContent.totalRevenue || 'Total Revenue (All Time)'}
          </p>
          <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)' }}>{formatCurrency(stats.revenue?.total_revenue)}</p>
        </Card>
        <Card padding="lg" hoverable>
          <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
            {reportsContent.revenue30d || 'Revenue (Last 30 Days)'}
          </p>
          <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)' }}>{formatCurrency(stats.revenue?.revenue_30d)}</p>
        </Card>
        <Card padding="lg" hoverable>
          <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
            {reportsContent.serviceFees || 'Total Service Fees'}
          </p>
          <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{formatCurrency(stats.revenue?.total_service_fees)}</p>
        </Card>
      </div>

      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>{reportsContent.bookingDistribution || 'Booking Distribution'}</h2>
      <Card padding="lg" style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          {reportsContent.totalBookings || 'Total bookings'}: <strong>{totalBookings}</strong>
          {stats.bookings?.bookings_30d > 0 && (
            <span style={{ color: 'var(--color-success)', marginLeft: '0.5rem' }}>(+{stats.bookings.bookings_30d} {reportsContent.inLast30Days || 'in last 30 days'})</span>
          )}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookingStatuses.map((item) => {
            const percent = calculatePercent(item.count, totalBookings);
            return (
              <div key={item.status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{getStatusLabel(item.status)}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{item.count} ({percent}%)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${percent}%`, backgroundColor: getStatusColor(item.status), borderRadius: '4px', transition: 'width 500ms ease-out', minWidth: item.count > 0 ? '4px' : '0' }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>{reportsContent.platformOverview || 'Platform Overview'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <Card padding="lg" hoverable>
          <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '1rem' }}>{reportsContent.users || 'Users'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.total || 'Total'}</span><span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{stats.users?.total_users || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.guests || 'Guests'}</span><span>{stats.users?.total_guests || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.hosts || 'Hosts'}</span><span>{stats.users?.total_hosts || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.new30d || 'New (30d)'}</span><span style={{ color: 'var(--color-success)' }}>+{stats.users?.new_users_30d || 0}</span></div>
          </div>
        </Card>

        <Card padding="lg" hoverable>
          <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '1rem' }}>{reportsContent.listings || 'Listings'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.total || 'Total'}</span><span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{stats.listings?.total_listings || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.shortTerm || 'Short Term'}</span><span>{stats.listings?.short_term || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.longTerm || 'Long Term'}</span><span>{stats.listings?.long_term || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.pendingApproval || 'Pending Approval'}</span><span style={{ color: stats.listings?.pending_approval > 0 ? 'var(--color-warning)' : 'inherit', fontWeight: 'var(--font-weight-semibold)' }}>{stats.listings?.pending_approval || 0}</span></div>
          </div>
        </Card>

        <Card padding="lg" hoverable>
          <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '1rem' }}>{reportsContent.payments || 'Payments'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.pending || 'Pending'}</span><Badge variant="warning" size="sm">{stats.payments?.pending_payments || 0}</Badge></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.processing || 'Processing'}</span><Badge variant="info" size="sm">{stats.payments?.processing_payments || 0}</Badge></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.completed || 'Completed'}</span><Badge variant="success" size="sm">{stats.payments?.completed_payments || 0}</Badge></div>
          </div>
        </Card>

        <Card padding="lg" hoverable>
          <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', marginBottom: '1rem' }}>{reportsContent.withdrawals || 'Withdrawals'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.pendingRequests || 'Pending Requests'}</span><span style={{ fontWeight: 'var(--font-weight-semibold)', color: stats.withdrawals?.pending_withdrawals > 0 ? 'var(--color-warning)' : 'inherit' }}>{stats.withdrawals?.pending_withdrawals || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>{reportsContent.pendingAmount || 'Pending Amount'}</span><span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatCurrency(stats.withdrawals?.pending_amount)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}