// frontend/app/guest/bookings/page.jsx
// Guest Bookings Page — displays all bookings for the authenticated guest
// Includes a "Leave a Review" prompt for completed bookings
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
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import ReviewForm from '@/components/review/ReviewForm';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

export default function GuestBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  useEffect(() => {
    async function fetchBookings() {
      try {
        const response = await apiClient.get('/bookings/guest');
        setBookings(response.data || []);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setError('Please log in to view your bookings.');
        } else {
          setError('Unable to load bookings. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchBookings();
  }, []);

  function getStatusBadge(status) {
    const variantMap = {
      pending: 'warning', confirmed: 'success', cancelled: 'danger',
      completed: 'info', rejected: 'danger', expired: 'default',
    };
    return variantMap[status] || 'default';
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function handleReviewClick(bookingId) {
    setSelectedBookingId(bookingId);
    setReviewModalOpen(true);
  }

  function handleReviewSuccess() {
    setReviewModalOpen(false);
    setSelectedBookingId(null);
    // Refresh bookings to update UI if needed
    window.location.reload();
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
          <Skeleton type="rect" height="40px" width="200px" />
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} type="card" />)}
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
          <h1 style={{ marginBottom: '1rem' }}>My Bookings</h1>
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
      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '800px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>My Bookings</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>Manage your upcoming and past stays.</p>
        </div>

        {bookings.length === 0 ? (
          <EmptyState 
            icon="calendar" 
            title="No bookings yet" 
            description="Start exploring listings to book your first stay!" 
            actionLabel="Browse Listings" 
            actionHref={constants.ROUTES.LISTINGS} 
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bookings.map((booking) => (
              <Card key={booking.id} padding="lg">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <Link href={`/listings/${booking.listing_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.25rem', fontSize: 'var(--font-size-lg)' }}>
                        {booking.listing_title || 'Property'}
                      </p>
                    </Link>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {booking.city || ''}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)', marginTop: '0.5rem' }}>
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

                {/* Leave a Review Button for Completed Bookings */}
                {booking.status === 'completed' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleReviewClick(booking.id)}
                    >
                      Leave a Review
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Review Modal */}
      <Modal 
        isOpen={reviewModalOpen} 
        onClose={() => setReviewModalOpen(false)}
        title="Write a Review"
        size="md"
      >
        {selectedBookingId && (
          <ReviewForm 
            bookingId={selectedBookingId} 
            onSuccess={handleReviewSuccess} 
            onCancel={() => setReviewModalOpen(false)} 
          />
        )}
      </Modal>

      <Footer />
    </>
  );
}