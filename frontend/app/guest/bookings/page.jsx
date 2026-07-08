// frontend/app/guest/bookings/page.jsx
// Guest Bookings Page — lists all bookings with status filters and pagination
// Allows guests to view, filter, and manage their booking history
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
 * Guest Bookings Page
 * Displays a paginated list of the authenticated guest's bookings.
 * Supports filtering by booking status (pending, confirmed, completed, cancelled).
 * Each booking card shows property details, dates, amount, and status.
 */
export default function GuestBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches bookings from the API with current pagination and filter settings.
   * Wrapped in useCallback to allow retry on error.
   */
  const fetchBookings = useCallback(async (page = 1, status = statusFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (status) params.set('status', status);

      const response = await apiClient.get(`/bookings/guest?${params.toString()}`);

      setBookings(response?.data || []);
      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load bookings. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  // Fetch bookings on mount and when filters change
  useEffect(() => {
    fetchBookings(1, statusFilter);
  }, [statusFilter, fetchBookings]);

  /**
   * Handles page change from the Pagination component.
   *
   * @param {number} page - The new page number
   */
  function handlePageChange(page) {
    fetchBookings(page, statusFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Handles status filter change. Resets to page 1 on filter change.
   *
   * @param {string} status - The selected status filter
   */
  function handleStatusChange(status) {
    setStatusFilter(status);
  }

  /**
   * Returns the appropriate badge variant for a booking status.
   *
   * @param {string} status - Booking status
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
   * Formats a date string into a readable format.
   *
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Calculates the number of nights between two dates.
   *
   * @param {string} checkIn - Check-in date
   * @param {string} checkOut - Check-out date
   * @returns {number} Number of nights
   */
  function calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    return Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  }

  // Filter tabs configuration
  const filters = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.5rem' }}>
            My Bookings
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Track and manage all your property bookings in one place.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button
              key={f.value}
              className={`btn btn--sm ${statusFilter === f.value ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => handleStatusChange(f.value)}
            >
              {f.label}
              {f.value === '' && pagination.totalItems > 0 && ` (${pagination.totalItems})`}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <Card padding="lg" style={{ marginBottom: '2rem', borderLeft: '3px solid var(--color-error)' }}>
            <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchBookings(1, statusFilter)}>
              Try Again
            </Button>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} type="rect" height="100px" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          /* Empty State */
          <Card padding="lg">
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                {statusFilter
                  ? `No ${statusFilter} bookings found.`
                  : 'You haven\'t made any bookings yet.'}
              </p>
              <Link href={constants.ROUTES.LISTINGS} className="btn btn--primary">
                Browse Listings
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Bookings List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {bookings.map((booking) => (
                <Card key={booking.id} padding="lg" hoverable>
                  <Link
                    href={`/guest/bookings/${booking.id}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', textDecoration: 'none', color: 'inherit' }}
                  >
                    {/* Booking Details */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.5rem' }}>
                        {booking.listing_title || 'Property'}
                      </h3>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                        {booking.city || 'Location not specified'}
                      </p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                        {formatDate(booking.check_in_date)} — {formatDate(booking.check_out_date)}
                        <span style={{ marginLeft: '0.5rem' }}>
                          ({calculateNights(booking.check_in_date, booking.check_out_date)} nights)
                        </span>
                      </p>
                      {booking.special_requests && (
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          Note: {booking.special_requests.substring(0, 100)}
                        </p>
                      )}
                    </div>

                    {/* Price and Status */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)', marginBottom: '0.5rem' }}>
                        {constants.CURRENCY_SYMBOL} {Number(booking.total_amount).toLocaleString()}
                      </p>
                      <Badge variant={getStatusBadge(booking.status)} size="sm">
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </div>
                  </Link>
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

      <Footer />
    </>
  );
}