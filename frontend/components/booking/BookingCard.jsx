// frontend/components/booking/BookingCard.jsx
// Booking sidebar card for listing detail pages
// Integrates the payment-first flow — opens BookingPaymentModal on "Book Now"
// Combines date picker, guest selector, price breakdown, and payment modal
// Author: Theron

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from '@/components/booking/DatePicker';
import GuestSelector from '@/components/booking/GuestSelector';
import PriceBreakdown from '@/components/booking/PriceBreakdown';
import BookingPaymentModal from '@/components/booking/BookingPaymentModal';
import Button from '@/components/ui/Button';
import useAuth from '@/hooks/useAuth';
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

  /**
   * Determines the price per unit based on the listing type.
   * Short-term uses price per night; long-term uses price per month.
   */
  const pricePerUnit = listing.listingType === 'long_term'
    ? listing.pricePerMonth
    : listing.pricePerNight;

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
        {estimate && (
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
            disabled={!checkIn || !checkOut}
          >
            {checkIn && checkOut ? 'Book Now' : 'Select Dates to Book'}
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