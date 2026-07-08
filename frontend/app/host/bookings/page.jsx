// frontend/app/host/bookings/page.jsx
// Host Bookings Management Page
// Displays all bookings for the host's listings with status filters
// Allows hosts to confirm or reject pending booking requests
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
 * Host Bookings Page
 * Provides hosts with a comprehensive view of all bookings across their listings.
 * Supports filtering by booking status and performing actions on pending bookings.
 * Each booking card displays guest information, dates, pricing, and current status.
 */
export default function HostBookingsPage() {

  // Booking data state — array of booking objects from the API
  const [bookings, setBookings] = useState([]);

  // Pagination state — tracks current page and total pages for navigation
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });

  // Active status filter — filters bookings by their current status
  const [statusFilter, setStatusFilter] = useState('');

  // Loading and error states for UI feedback
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tracks which booking is currently being processed to prevent double-clicks
  const [processingId, setProcessingId] = useState(null);

  /**
   * Fetches bookings from the host API endpoint.
   * Retrieves paginated results filtered by the current status selection.
   * Wrapped in useCallback to enable retry functionality on error.
   *
   * @param {number} [page=1]   - Page number to fetch
   * @param {string} [status=''] - Status filter value
   */
  const fetchBookings = useCallback(async (page = 1, status = statusFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (status) {
        params.set('status', status);
      }

      const response = await apiClient.get(`/bookings/host?${params.toString()}`);

      setBookings(response?.data || []);

      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Please log in to view your bookings.');
        } else if (err.status === 403) {
          setError('You need a host account to access this page.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load bookings. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  // Fetch bookings when the component mounts or the status filter changes
  useEffect(() => {
    fetchBookings(1, statusFilter);
  }, [statusFilter, fetchBookings]);

  /**
   * Handles booking status updates (confirm or reject).
   * Sends a PATCH request to the API and updates local state on success.
   *
   * @param {string} bookingId - The booking ID to update
   * @param {string} newStatus - The new status ('confirmed' or 'rejected')
   */
  async function handleStatusUpdate(bookingId, newStatus) {
    setProcessingId(bookingId);

    try {
      await apiClient.patch(`/bookings/${bookingId}/status`, {
        status: newStatus,
      });

      // Update the booking in local state immediately for responsive UX
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: newStatus } : b
        )
      );
    } catch (err) {
      console.error('Failed to update booking status:', err.message);
    } finally {
      setProcessingId(null);
    }
  }

  /**
   * Handles page changes from the Pagination component.
   * Scrolls to the top of the page for a smooth user experience.
   *
   * @param {number} page - The new page number
   */
  function handlePageChange(page) {
    fetchBookings(page, statusFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Handles status filter changes.
   * Resets to the first page when the filter changes.
   *
   * @param {string} status - The selected status filter value
   */
  function handleStatusChange(status) {
    setStatusFilter(status);
  }

  /**
   * Returns the appropriate badge variant for a booking status.
   * Maps each status to a color-coded badge for visual clarity.
   *
   * @param {string} status - The booking status
   * @returns {string} CSS badge variant name
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

  /**
   * Calculates the number of nights between two dates.
   *
   * @param {string} checkIn  - Check-in date string
   * @param {string} checkOut - Check-out date string
   * @returns {number} Number of nights
   */
  function calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    return Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );
  }

  // Filter tabs configuration — each tab represents a booking status
  const filters = [
    { value: '',         label: 'All' },
    { value: 'pending',   label: 'Pending' },
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
          <h1
            style={{
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: '0.5rem',
            }}
          >
            Guest Bookings
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Manage bookings across all your properties. Confirm or reject pending requests.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
          }}
        >
          {filters.map((f) => (
            <button
              key={f.value}
              className={`btn btn--sm ${statusFilter === f.value ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => handleStatusChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <Card
            padding="lg"
            style={{
              marginBottom: '1.5rem',
              borderLeft: '3px solid var(--color-error)',
            }}
          >
            <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchBookings(1, statusFilter)}
            >
              Try Again
            </Button>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} type="rect" height="140px" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          /* Empty State */
          <Card padding="lg">
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p
                style={{
                  fontSize: 'var(--font-size-lg)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '1.5rem',
                }}
              >
                {statusFilter
                  ? `No ${statusFilter} bookings found.`
                  : 'No bookings yet. Create listings to start receiving bookings.'}
              </p>
              <Link href="/host/my-listings/create" className="btn btn--primary">
                Create a Listing
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Bookings List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              {bookings.map((booking) => (
                <Card key={booking.id} padding="lg">
                  {/* Booking Header — Listing title and status badge */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <h3
                        style={{
                          fontSize: 'var(--font-size-base)',
                          fontWeight: 'var(--font-weight-semibold)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {booking.listing_title || 'Property'}
                      </h3>
                      <p
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {booking.city || 'Location not specified'}
                      </p>
                    </div>
                    <Badge variant={getStatusBadge(booking.status)} size="sm">
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>

                  {/* Booking Details — Guest info, dates, and pricing */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem',
                      padding: '1rem',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    {/* Guest Information */}
                    <div>
                      <span style={{ color: 'var(--color-text-light)', display: 'block', marginBottom: '0.25rem' }}>
                        Guest
                      </span>
                      <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                        {booking.guest_first_name} {booking.guest_last_name}
                      </span>
                    </div>

                    {/* Stay Dates */}
                    <div>
                      <span style={{ color: 'var(--color-text-light)', display: 'block', marginBottom: '0.25rem' }}>
                        Stay Dates
                      </span>
                      <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                        {formatDate(booking.check_in_date)} — {formatDate(booking.check_out_date)}
                      </span>
                      <span style={{ color: 'var(--color-text-light)', marginLeft: '0.5rem' }}>
                        ({calculateNights(booking.check_in_date, booking.check_out_date)} nights)
                      </span>
                    </div>

                    {/* Guest Count */}
                    <div>
                      <span style={{ color: 'var(--color-text-light)', display: 'block', marginBottom: '0.25rem' }}>
                        Guests
                      </span>
                      <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                        {booking.guest_count} {booking.guest_count === 1 ? 'person' : 'people'}
                      </span>
                    </div>

                    {/* Booking Amount */}
                    <div>
                      <span style={{ color: 'var(--color-text-light)', display: 'block', marginBottom: '0.25rem' }}>
                        Total Amount
                      </span>
                      <span style={{ fontWeight: 'var(--font-weight-bold)' }}>
                        {constants.CURRENCY_SYMBOL} {Number(booking.total_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Guest Message — displayed if provided */}
                  {booking.special_requests && (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'var(--color-info-light)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1rem',
                        fontSize: 'var(--font-size-sm)',
                        color: '#1E40AF',
                      }}
                    >
                      <strong>Guest Message:</strong> {booking.special_requests}
                    </div>
                  )}

                  {/* Action Buttons — only shown for pending bookings */}
                  {booking.status === 'pending' && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'flex-end',
                        borderTop: '1px solid var(--color-border-light)',
                        paddingTop: '1rem',
                      }}
                    >
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleStatusUpdate(booking.id, 'rejected')}
                        isLoading={processingId === booking.id}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                        isLoading={processingId === booking.id}
                      >
                        Confirm
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
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