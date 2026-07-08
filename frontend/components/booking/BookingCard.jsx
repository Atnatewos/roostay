// frontend/components/booking/BookingCard.jsx
// Booking sidebar card for listing detail pages
// Integrates the payment-first flow — opens BookingPaymentModal on "Book Now"
// Combines date picker, guest selector, price breakdown, and payment modal
// Fetches blocked dates from API and shows unavailable date messaging
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
import { apiClient } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Booking Card Component
 * Provides the complete booking flow on listing detail pages.
 *
 * Flow:
 * 1. Guest selects check-in/check-out dates using the DatePicker
 * 2. Guest selects number of guests using GuestSelector
 * 3. Pricing is calculated client-side as an estimate
 * 4. Guest clicks "Book Now" → BookingPaymentModal opens
 * 5. Guest enters transaction number and submits → booking + payment created
 * 6. Success state shows countdown timer for payment completion
 *
 * Enhanced with blocked date detection:
 * - Fetches blocked date ranges from the API
 * - Shows next available date when selected dates are blocked
 * - Displays a link to similar properties
 *
 * @param {Object}        props
 * @param {Object}        props.listing          - Full listing data object
 * @param {Array<string>} [props.blockedDates]   - Array of unavailable dates (YYYY-MM-DD)
 * @param {Function}      [props.onBookingComplete] - Callback after successful booking
 */
export default function BookingCard({
  listing,
  blockedDates = [],
  onBookingComplete,
}) {

  const router = useRouter();

  // Get authentication state to check if user is logged in
  const { isAuthenticated } = useAuth();

  // =========================================================================
  // DATE SELECTION STATE
  // Tracks the guest's selected check-in and check-out dates
  // =========================================================================
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);

  // =========================================================================
  // GUEST SELECTION STATE
  // Tracks the number of adults, children, and infants
  // =========================================================================
  const [guests, setGuests] = useState({
    adults: 1,
    children: 0,
    infants: 0,
    total: 1,
  });

  // =========================================================================
  // DATE PICKER VISIBILITY
  // Toggles the inline date picker dropdown
  // =========================================================================
  const [showDatePicker, setShowDatePicker] = useState(false);

  // =========================================================================
  // PAYMENT MODAL VISIBILITY
  // Controls the BookingPaymentModal open/close state
  // =========================================================================
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // =========================================================================
  // ERROR STATE
  // Displays validation errors before opening the payment modal
  // =========================================================================
  const [error, setError] = useState(null);

  // =========================================================================
  // BLOCKED DATES DATA FROM API
  // Stores blocked date ranges fetched from the API for messaging
  // =========================================================================
  const [blockedRanges, setBlockedRanges] = useState([]);

  // =========================================================================
  // DATE CONFLICT STATE
  // Tracks whether the user's selected dates conflict with existing bookings
  // Used to show the "dates unavailable" message instead of the booking form
  // =========================================================================
  const [selectedDatesBlocked, setSelectedDatesBlocked] = useState(false);

  // =========================================================================
  // NEXT AVAILABLE DATE
  // Calculated when selected dates are blocked — suggests the next open slot
  // =========================================================================
  const [nextAvailableDate, setNextAvailableDate] = useState(null);

  /**
   * Determines the price per unit based on the listing type.
   * Short-term uses price per night; long-term uses price per month.
   */
  const pricePerUnit = listing.listingType === 'long_term'
    ? listing.pricePerMonth
    : listing.pricePerNight;

  // =========================================================================
  // FETCH BLOCKED DATES ON MOUNT
  // Retrieves blocked date ranges from the API for date conflict detection
  // =========================================================================
  useEffect(() => {
    if (!listing.id) return;

    async function fetchBlockedDates() {
      try {
        const response = await apiClient.get(`/listings/${listing.id}/blocked-dates`);

        if (response?.data?.blockedRanges) {
          setBlockedRanges(response.data.blockedRanges);
        }
      } catch (err) {
        // Silently handle — the DatePicker has its own API call as well
        console.error('Failed to fetch blocked dates for conflict check:', err.message);
      }
    }

    fetchBlockedDates();
  }, [listing.id]);

  // =========================================================================
  // CHECK DATE CONFLICTS
  // Whenever check-in or blocked ranges change, check if the selected dates
  // overlap with any booked or pending date ranges
  // =========================================================================
  useEffect(() => {
    if (!checkIn || !checkOut || blockedRanges.length === 0) {
      setSelectedDatesBlocked(false);
      setNextAvailableDate(null);
      return;
    }

    const selectedStart = new Date(checkIn);
    const selectedEnd = new Date(checkOut);

    // Check each blocked range for overlap with the selected dates
    let hasConflict = false;
    let nextAvailable = null;

    for (const range of blockedRanges) {
      const rangeStart = new Date(range.startDate + 'T00:00:00');
      const rangeEnd = new Date(range.endDate + 'T00:00:00');

      // Check if the selected range overlaps with this blocked range
      if (selectedStart < rangeEnd && selectedEnd > rangeStart) {
        hasConflict = true;

        // Calculate the next available date (day after this blocked range ends)
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
   * Handles date selection from the DatePicker component.
   * Receives both check-in and check-out dates when the user completes selection.
   * Automatically hides the date picker when both dates are selected.
   *
   * @param {Object} dates - Selected dates { checkIn, checkOut }
   */
  function handleDateChange({ checkIn: newCheckIn, checkOut: newCheckOut }) {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
    setError(null);

    // Close the date picker once both dates are selected
    if (newCheckIn && newCheckOut) {
      setShowDatePicker(false);
    }
  }

  /**
   * Handles guest count changes from the GuestSelector component.
   *
   * @param {Object} guestData - Guest count data { adults, children, infants, total }
   */
  function handleGuestChange(guestData) {
    setGuests(guestData);
    setError(null);
  }

  /**
   * Handles clicking the next available date suggestion.
   * Pre-fills the date picker with the suggested check-in date.
   *
   * @param {Date} date - The suggested available date
   */
  function handleSelectNextAvailable(date) {
    const checkInStr = date.toISOString().split('T')[0];

    // Set a default 2-night stay from the available date
    const checkOutDate = new Date(date);
    checkOutDate.setDate(checkOutDate.getDate() + 2);
    const checkOutStr = checkOutDate.toISOString().split('T')[0];

    setCheckIn(checkInStr);
    setCheckOut(checkOutStr);
    setSelectedDatesBlocked(false);
    setError(null);
  }

  /**
   * Calculates estimated pricing based on selected dates and listing rates.
   * This is a client-side estimate for display purposes.
   * The server calculates the final confirmed price on booking creation.
   *
   * @returns {Object|null} Estimated pricing breakdown or null if dates not selected
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

    // Service fee is calculated as 5% of base amount with min/max caps
    const serviceFeePercent = 5;
    const serviceFeeMin = 100;
    const serviceFeeMax = 5000;
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
  }, [checkIn, checkOut, pricePerUnit, listing]);

  /**
   * Handles the "Book Now" button click.
   * Validates that dates are selected and user is authenticated before opening the payment modal.
   * Redirects unauthenticated users to the login page.
   */
  function handleBookNowClick() {
    // Clear any previous errors
    setError(null);

    // Validate that dates have been selected
    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates.');
      return;
    }

    // Block booking if selected dates are unavailable
    if (selectedDatesBlocked) {
      setError('These dates are not available. Please choose different dates.');
      return;
    }

    // Redirect unauthenticated users to login
    if (!isAuthenticated) {
      router.push(`/login?redirect=/listings/${listing.id}`);
      return;
    }

    // Open the payment modal for the booking flow
    setShowPaymentModal(true);
  }

  /**
   * Handles successful booking completion from the payment modal.
   * Closes the modal and notifies the parent component.
   *
   * @param {Object} bookingData - The booking response from the API
   */
  function handleBookingComplete(bookingData) {
    if (onBookingComplete) {
      onBookingComplete(bookingData);
    }
  }

  /**
   * Closes the payment modal and resets any errors.
   */
  function handleClosePaymentModal() {
    setShowPaymentModal(false);
    setError(null);
  }

  // Calculate the current pricing estimate
  const estimate = calculateEstimate();

  // Format the date display string for the date selector button
  const dateDisplay = checkIn && checkOut
    ? `${new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Select check-in and check-out dates';

  // Format the next available date for display
  const nextAvailableDisplay = nextAvailableDate
    ? nextAvailableDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <>
      {/* Booking Sidebar Card */}
      <div className="booking-card">
        {/* Price Header — Shows price per night/month and rating */}
        <div className="booking-card__header">
          <span className="booking-card__price">
            <strong>
              {constants.CURRENCY_SYMBOL} {pricePerUnit?.toLocaleString()}
            </strong>
            <span className="booking-card__price-unit">
              /{listing.listingType === 'long_term' ? 'month' : 'night'}
            </span>
          </span>

          {/* Rating display if reviews exist */}
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

        {/* ===================================================================
            DATES UNAVAILABLE MESSAGE
            Shown when the user selects dates that conflict with existing bookings.
            Displays the blocked date range info, next available date,
            and links to similar properties.
            =================================================================== */}
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
              {/* Warning Icon and Title */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="var(--color-warning)"
                  strokeWidth="2"
                  style={{ flexShrink: 0, marginTop: '2px' }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p
                    style={{
                      fontWeight: 'var(--font-weight-semibold)',
                      fontSize: 'var(--font-size-sm)',
                      color: '#92400E',
                      marginBottom: '0.25rem',
                    }}
                  >
                    These dates are not available
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: '#92400E',
                      lineHeight: '1.5',
                    }}
                  >
                    This property is booked for some or all of the dates you selected.
                    Please choose different dates or explore similar properties.
                  </p>
                </div>
              </div>

              {/* Next Available Date Suggestion */}
              {nextAvailableDisplay && (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-white)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '0.75rem',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Next available date:
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-success)',
                      }}
                    >
                      {nextAvailableDisplay}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSelectNextAvailable(nextAvailableDate)}
                    >
                      Select This Date
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Links */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-primary)',
                    fontWeight: 'var(--font-weight-semibold)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Choose different dates
                </button>

                <Link
                  href={`/listings/${listing.id}/similar`}
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-primary)',
                    fontWeight: 'var(--font-weight-semibold)',
                    textDecoration: 'underline',
                  }}
                >
                  View similar properties
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Date Selection Section */}
        <div className="booking-card__section">
          <button
            className="booking-card__date-trigger"
            onClick={() => setShowDatePicker(!showDatePicker)}
            type="button"
            aria-expanded={showDatePicker}
            aria-label="Select check-in and check-out dates"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{dateDisplay}</span>
          </button>

          {/* Inline Date Picker — Shown when user clicks the date trigger */}
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
                bookingType={
                  listing.listingType === 'both' ? 'short_term' : listing.listingType
                }
              />
            </div>
          )}
        </div>

        {/* Guest Selection Section */}
        <div className="booking-card__section">
          <GuestSelector
            maxGuests={listing.maxGuests}
            onChange={handleGuestChange}
            initialValues={guests}
          />
        </div>

        {/* Price Breakdown — Shown when dates are selected and pricing is available */}
        {estimate && !selectedDatesBlocked && (
          <div className="booking-card__section">
            <PriceBreakdown
              pricing={estimate}
              nights={estimate.nights}
              months={estimate.months}
              pricePerUnit={pricePerUnit}
              bookingType={
                listing.listingType === 'both' ? 'short_term' : listing.listingType
              }
              compact
            />
          </div>
        )}

        {/* Book Now Button and Error Display */}
        <div className="booking-card__actions">
          {/* Validation Error — Shown when user clicks book without selecting dates */}
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

          {/* Book Now Button — Opens the payment modal */}
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

          {/* Informational text — assures guest they won't be charged immediately */}
          <p className="booking-card__no-charge">
            You won&apos;t be charged until your booking is confirmed
          </p>
        </div>
      </div>

      {/* Booking Payment Modal — Opens when guest clicks "Book Now" */}
      <BookingPaymentModal
        isOpen={showPaymentModal}
        onClose={handleClosePaymentModal}
        listing={listing}
        bookingData={{
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guestCount: guests.total,
          bookingType:
            listing.listingType === 'both' ? 'short_term' : listing.listingType,
        }}
        pricing={estimate}
        onBookingComplete={handleBookingComplete}
      />
    </>
  );
}