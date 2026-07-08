// frontend/app/guest/bookings/[id]/page.jsx
// Booking Detail Page
// Displays full details for a single booking with actions for payment and review
// Shows property info, host details, pricing breakdown, status, and timeline
// Author: Theron

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import PaymentProof from '@/components/payment/PaymentProof';
import ReviewForm from '@/components/review/ReviewForm';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Booking Detail Page
 * Provides a comprehensive view of a single booking including property details,
 * host information, stay dates, pricing breakdown, and current status.
 * Guests can make payments, upload proof, cancel bookings, and submit reviews.
 */
export default function BookingDetailPage() {

  const params = useParams();
  const router = useRouter();
  const bookingId = params.id;

  // Booking data state
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action states
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  /**
   * Fetches booking details from the API on component mount.
   */
  useEffect(() => {
    async function fetchBooking() {
      try {
        const response = await apiClient.get(`/bookings/${bookingId}`);

        if (response?.data?.booking) {
          setBooking(response.data.booking);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setError('Please log in to view this booking.');
          } else if (err.status === 404) {
            setError('Booking not found.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to load booking details.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  /**
   * Cancels the current booking.
   * Sends a PATCH request and updates local state on success.
   */
  async function handleCancelBooking() {
    setIsCancelling(true);

    try {
      await apiClient.patch(`/bookings/${bookingId}/status`, {
        status: 'cancelled',
        cancellationReason: 'Cancelled by guest',
      });

      setBooking((prev) => ({ ...prev, status: 'cancelled' }));
      setCancelModalOpen(false);
    } catch (err) {
      console.error('Failed to cancel booking:', err.message);
    } finally {
      setIsCancelling(false);
    }
  }

  /**
   * Returns badge variant for booking status.
   *
   * @param {string} status - Booking status
   * @returns {string} CSS badge variant
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
   * Formats a date string for display.
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
   * Calculates nights between two dates.
   *
   * @param {string} checkIn  - Check-in date
   * @param {string} checkOut - Check-out date
   * @returns {number} Number of nights
   */
  function calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    return Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  }

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '700px' }}>
          <Skeleton type="rect" height="40px" width="250px" />
          <div style={{ marginTop: '2rem' }}>
            <Skeleton type="rect" height="300px" />
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
          <h1 style={{ marginBottom: '1rem' }}>Booking</h1>
          <p style={{ color: 'var(--color-error)', marginBottom: '2rem' }}>{error}</p>
          <Link href={constants.ROUTES.GUEST_BOOKINGS} className="btn btn--primary">
            Back to My Bookings
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  if (!booking) return null;

  const nights = calculateNights(booking.check_in_date, booking.check_out_date);

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '700px' }}>
        {/* Back Navigation */}
        <Link
          href={constants.ROUTES.GUEST_BOOKINGS}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            marginBottom: '1.5rem',
          }}
        >
          &larr; Back to My Bookings
        </Link>

        {/* Booking Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.5rem' }}>
              {booking.listing_title || 'Property'}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Booking #{booking.id.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <Badge variant={getStatusBadge(booking.status)} size="md">
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        {/* Stay Details Card */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>
            Stay Details
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Check-in */}
            <div>
              <span style={{ color: 'var(--color-text-light)', display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: '0.25rem' }}>
                Check-in
              </span>
              <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-lg)' }}>
                {formatDate(booking.check_in_date)}
              </span>
            </div>

            {/* Check-out */}
            <div>
              <span style={{ color: 'var(--color-text-light)', display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: '0.25rem' }}>
                Check-out
              </span>
              <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-lg)' }}>
                {formatDate(booking.check_out_date)}
              </span>
            </div>

            {/* Duration */}
            <div>
              <span style={{ color: 'var(--color-text-light)', display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: '0.25rem' }}>
                Duration
              </span>
              <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-lg)' }}>
                {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            </div>

            {/* Guests */}
            <div>
              <span style={{ color: 'var(--color-text-light)', display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: '0.25rem' }}>
                Guests
              </span>
              <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-lg)' }}>
                {booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}
              </span>
            </div>
          </div>
        </Card>

        {/* Pricing Breakdown Card */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>
            Pricing
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {constants.CURRENCY_SYMBOL} {Number(booking.base_amount / nights).toLocaleString()} x {nights} nights
              </span>
              <span>{constants.CURRENCY_SYMBOL} {Number(booking.base_amount).toLocaleString()}</span>
            </div>

            {booking.cleaning_fee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Cleaning fee</span>
                <span>{constants.CURRENCY_SYMBOL} {Number(booking.cleaning_fee).toLocaleString()}</span>
              </div>
            )}

            {booking.service_fee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Service fee</span>
                <span>{constants.CURRENCY_SYMBOL} {Number(booking.service_fee).toLocaleString()}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '2px solid var(--color-border)',
                fontWeight: 'var(--font-weight-bold)',
                fontSize: 'var(--font-size-lg)',
              }}
            >
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>
                {constants.CURRENCY_SYMBOL} {Number(booking.total_amount).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* Timeline Card */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem' }}>
            Timeline
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: 'var(--font-size-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Booking created</span>
              <span>{formatDate(booking.created_at)}</span>
            </div>
            {booking.confirmed_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Confirmed</span>
                <span>{formatDate(booking.confirmed_at)}</span>
              </div>
            )}
            {booking.cancelled_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Cancelled</span>
                <span>{formatDate(booking.cancelled_at)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Cancel button — only for pending or confirmed bookings */}
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <Button variant="danger" onClick={() => setCancelModalOpen(true)}>
              Cancel Booking
            </Button>
          )}

          {/* Payment button — for confirmed bookings */}
          {booking.status === 'confirmed' && (
            <Button variant="primary" onClick={() => setPaymentModalOpen(true)}>
              Make Payment
            </Button>
          )}

          {/* Review button — for completed bookings */}
          {booking.status === 'completed' && (
            <Button variant="primary" onClick={() => setReviewModalOpen(true)}>
              Write a Review
            </Button>
          )}
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Booking"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
              Keep Booking
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelBooking}
              isLoading={isCancelling}
            >
              Cancel Booking
            </Button>
          </div>
        }
      >
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
          Are you sure you want to cancel this booking? This action cannot be undone.
        </p>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Upload Payment Proof"
        size="md"
      >
        <PaymentProof
          paymentId={booking.id}
          onSuccess={() => {
            setPaymentModalOpen(false);
            // Refresh booking data
            window.location.reload();
          }}
        />
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Write a Review"
        size="md"
      >
        <ReviewForm
          bookingId={booking.id}
          onSuccess={() => {
            setReviewModalOpen(false);
            setBooking((prev) => ({ ...prev, status: 'reviewed' }));
          }}
          onCancel={() => setReviewModalOpen(false)}
        />
      </Modal>

      <Footer />
    </>
  );
}