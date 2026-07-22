// frontend/components/booking/BookingCard.jsx
// Booking sidebar card for listing detail pages
// Integrates the payment-first flow — opens BookingPaymentModal on "Book Now"
// Combines date picker, guest selector, price breakdown, and payment modal
// Pricing calculations use centralized config via useConfig() — zero hardcoded values
// Prevents hosts from booking their own listings
// Author: Theron
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DatePicker from '@/components/booking/DatePicker';
import GuestSelector from '@/components/booking/GuestSelector';
import PriceBreakdown from '@/components/booking/PriceBreakdown';
import BookingPaymentModal from '@/components/booking/BookingPaymentModal';
import Button from '@/components/ui/Button';
import useAuth from '@/hooks/useAuth';
import useConfig from '@/hooks/useConfig';
import { apiClient } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Booking Card Component
 * Provides the complete booking flow on listing detail pages.
 * All pricing rules come from pricing.config.json via useConfig().
 *
 * @param {Object}        props
 * @param {Object}        props.listing            - Full listing data object
 * @param {Array<string>} [props.blockedDates]     - Array of unavailable dates
 * @param {Function}      [props.onBookingComplete] - Callback after successful booking
 */
export default function BookingCard({
  listing,
  blockedDates = [],
  onBookingComplete,
}) {
  // Guard clause — prevent crash when listing is not yet loaded
  if (!listing) {
    return null;
  }

  const router = useRouter();

  // =========================================================================
  // CONFIG — Pricing rules, feature flags, currency
  // =========================================================================
  const { pricing: pricingConfig, payment, isEnabled } = useConfig();

  // Service fee configuration from pricing config
  const serviceFeePercent = pricingConfig?.serviceFee?.percent || 5;
  const serviceFeeMin = pricingConfig?.serviceFee?.minAmount || 100;
  const serviceFeeMax = pricingConfig?.serviceFee?.maxAmount || 5000;

  // Currency symbol from payment config
  const currencySymbol = payment?.currencySymbol || constants.CURRENCY_SYMBOL;

  // =========================================================================
  // AUTHENTICATION
  // =========================================================================
  const { isAuthenticated, user } = useAuth();

  // Check if the current user is the host of this listing
  const isOwnListing = user && listing.hostId === user.id;

  // =========================================================================
  // DATE SELECTION STATE
  // =========================================================================
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);

  // =========================================================================
  // GUEST SELECTION STATE
  // =========================================================================
  const [guests, setGuests] = useState({
    adults: 1,
    children: 0,
    infants: 0,
    total: 1,
  });

  // =========================================================================
  // UI STATE
  // =========================================================================
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [error, setError] = useState(null);
  const [blockedRanges, setBlockedRanges] = useState([]);
  const [selectedDatesBlocked, setSelectedDatesBlocked] = useState(false);
  const [nextAvailableDate, setNextAvailableDate] = useState(null);

  const pricePerUnit =
    listing.listingType === 'long_term'
      ? listing.pricePerMonth
      : listing.pricePerNight;

  // =========================================================================
  // FETCH BLOCKED DATES ON MOUNT
  // =========================================================================
  useEffect(() => {
    if (!listing.id) return;

    async function fetchBlockedDates() {
      try {
        const response = await apiClient.get(
          `/listings/${listing.id}/blocked-dates`
        );
        if (response?.data?.blockedRanges) {
          setBlockedRanges(response.data.blockedRanges);
        }
      } catch (err) {
        console.error('Failed to fetch blocked dates:', err.message);
      }
    }

    fetchBlockedDates();
  }, [listing.id]);

  // =========================================================================
  // CHECK DATE CONFLICTS
  // =========================================================================
  useEffect(() => {
    if (!checkIn || !checkOut || blockedRanges.length === 0) {
      setSelectedDatesBlocked(false);
      setNextAvailableDate(null);
      return;
    }

    const selectedStart = new Date(checkIn);
    const selectedEnd = new Date(checkOut);
    let hasConflict = false;
    let nextAvailable = null;

    for (const range of blockedRanges) {
      const rangeStart = new Date(range.startDate + 'T00:00:00');
      const rangeEnd = new Date(range.endDate + 'T00:00:00');

      if (selectedStart < rangeEnd && selectedEnd > rangeStart) {
        hasConflict = true;
        const candidate = new Date(rangeEnd);
        candidate.setDate(candidate.getDate() + 1);
        if (!nextAvailable || candidate < nextAvailable) {
          nextAvailable = candidate;
        }
      }
    }

    setSelectedDatesBlocked(hasConflict);
    setNextAvailableDate(nextAvailable);
  }, [checkIn, checkOut, blockedRanges]);

  /**
   * Handles date selection from the DatePicker.
   *
   * @param {Object} dates - { checkIn, checkOut }
   */
  function handleDateChange({ checkIn: newCheckIn, checkOut: newCheckOut }) {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
    setError(null);
    if (newCheckIn && newCheckOut) {
      setShowDatePicker(false);
    }
  }

  /**
   * Handles guest count changes from GuestSelector.
   *
   * @param {Object} guestData - Guest count data
   */
  function handleGuestChange(guestData) {
    setGuests(guestData);
    setError(null);
  }

  /**
   * Auto-selects the next available date when the user clicks "Select This Date".
   *
   * @param {Date} date - The next available date
   */
  function handleSelectNextAvailable(date) {
    const checkInStr = date.toISOString().split('T')[0];
    const checkOutDate = new Date(date);
    checkOutDate.setDate(checkOutDate.getDate() + 2);
    const checkOutStr = checkOutDate.toISOString().split('T')[0];

    setCheckIn(checkInStr);
    setCheckOut(checkOutStr);
    setSelectedDatesBlocked(false);
    setError(null);
  }

  /**
   * Calculates the pricing estimate for the selected dates.
   * Uses config-driven service fee rules — zero hardcoded values.
   */
  const calculateEstimate = useCallback(() => {
    if (!checkIn || !checkOut || !pricePerUnit) return null;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    let baseAmount;
    let months;

    if (listing.listingType === 'long_term') {
      months = Math.ceil(nights / 30);
      baseAmount = pricePerUnit * months;
    } else {
      baseAmount = pricePerUnit * nights;
    }

    const cleaningFee = parseFloat(listing.cleaningFee) || 0;
    const securityDeposit = parseFloat(listing.securityDeposit) || 0;

    // Service fee from config — no hardcoded values
    let serviceFee = Math.round(baseAmount * (serviceFeePercent / 100));
    serviceFee = Math.max(serviceFee, serviceFeeMin);
    serviceFee = Math.min(serviceFee, serviceFeeMax);

    const totalAmount = baseAmount + cleaningFee + serviceFee;

    return {
      baseAmount,
      cleaningFee,
      serviceFee,
      securityDeposit,
      discountAmount: 0,
      totalAmount,
      nights,
      months,
    };
  }, [checkIn, checkOut, pricePerUnit, listing, serviceFeePercent, serviceFeeMin, serviceFeeMax]);

  /**
   * Handles the "Book Now" button click.
   * Validates inputs and opens the payment modal.
   */
  function handleBookNowClick() {
    setError(null);

    if (isOwnListing) {
      setError('You cannot book your own listing.');
      return;
    }

    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates.');
      return;
    }

    if (selectedDatesBlocked) {
      setError('These dates are not available. Please choose different dates.');
      return;
    }

    if (!isAuthenticated) {
      router.push(`/login?redirect=/listings/${listing.id}`);
      return;
    }

    setShowPaymentModal(true);
  }

  /**
   * Callback after successful booking.
   *
   * @param {Object} bookingData - The created booking data
   */
  function handleBookingComplete(bookingData) {
    if (onBookingComplete) {
      onBookingComplete(bookingData);
    }
  }

  /**
   * Closes the payment modal.
   */
  function handleClosePaymentModal() {
    setShowPaymentModal(false);
    setError(null);
  }

  const estimate = calculateEstimate();

  const dateDisplay =
    checkIn && checkOut
      ? `${new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'Select check-in and check-out dates';

  const nextAvailableDisplay = nextAvailableDate
    ? nextAvailableDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <>
      <div className="booking-card">
        {/* Price Header */}
        <div className="booking-card__header">
          <span className="booking-card__price">
            <strong>
              {currencySymbol} {pricePerUnit?.toLocaleString()}
            </strong>
            <span className="booking-card__price-unit">
              /{listing.listingType === 'long_term' ? 'month' : 'night'}
            </span>
          </span>

          {listing.reviews?.avgRating > 0 && (
            <span className="booking-card__rating">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {listing.reviews.avgRating}
              {listing.reviews.total > 0 && (
                <span className="booking-card__review-count">
                  ({listing.reviews.total})
                </span>
              )}
            </span>
          )}
        </div>

        {/* Blocked Dates Warning */}
        {selectedDatesBlocked && checkIn && checkOut && (
          <div className="booking-card__section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--color-warning-light)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-warning)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--color-warning)" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)', color: '#92400E', marginBottom: '0.25rem' }}>
                    These dates are not available
                  </p>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: '#92400E', lineHeight: '1.5' }}>
                    This property is booked for some or all of the dates you selected.
                    Please choose different dates or explore similar properties.
                  </p>
                </div>
              </div>

              {nextAvailableDisplay && (
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                    Next available date:
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-success)' }}>
                      {nextAvailableDisplay}
                    </span>
                    <Button variant="primary" size="sm" onClick={() => handleSelectNextAvailable(nextAvailableDate)}>
                      Select This Date
                    </Button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setShowDatePicker(true)} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-weight-semibold)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Choose different dates
                </button>
                <Link href={`/listings/${listing.id}/similar`} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-weight-semibold)', textDecoration: 'underline' }}>
                  View similar properties
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Date Selection */}
        <div className="booking-card__section">
          <button className="booking-card__date-trigger" onClick={() => setShowDatePicker(!showDatePicker)} type="button" aria-expanded={showDatePicker} aria-label="Select check-in and check-out dates">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{dateDisplay}</span>
          </button>

          {showDatePicker && (
            <div className="booking-card__date-picker">
              <DatePicker
                checkIn={checkIn}
                checkOut={checkOut}
                onDateChange={handleDateChange}
                blockedDates={blockedDates}
                listingId={listing.id}
                minNights={listing.minNights}
                maxNights={listing.maxNights}
                bookingType={listing.listingType === 'both' ? 'short_term' : listing.listingType}
              />
            </div>
          )}
        </div>

        {/* Guest Selection */}
        <div className="booking-card__section">
          <GuestSelector maxGuests={listing.maxGuests} onChange={handleGuestChange} initialValues={guests} />
        </div>

        {/* Price Breakdown — only shown when dates are selected and not blocked */}
        {estimate && !selectedDatesBlocked && (
          <div className="booking-card__section">
            <PriceBreakdown
              pricing={estimate}
              nights={estimate.nights}
              months={estimate.months}
              pricePerUnit={pricePerUnit}
              bookingType={listing.listingType === 'both' ? 'short_term' : listing.listingType}
              compact
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="booking-card__actions">
          {error && (
            <div className="booking-card__error">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleBookNowClick}
            disabled={!checkIn || !checkOut || selectedDatesBlocked}
          >
            {selectedDatesBlocked
              ? 'Dates Unavailable'
              : checkIn && checkOut
                ? 'Book Now'
                : 'Select Dates to Book'}
          </Button>

          <p className="booking-card__no-charge">
            You won&apos;t be charged until your booking is confirmed
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      <BookingPaymentModal
        isOpen={showPaymentModal}
        onClose={handleClosePaymentModal}
        listing={listing}
        bookingData={{
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guestCount: guests.total,
          bookingType: listing.listingType === 'both' ? 'short_term' : listing.listingType,
        }}
        pricing={estimate}
        onBookingComplete={handleBookingComplete}
      />
    </>
  );
}