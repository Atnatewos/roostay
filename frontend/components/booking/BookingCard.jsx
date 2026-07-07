'use client';
import { useState, useCallback } from 'react';
import DatePicker from '@/components/booking/DatePicker';
import GuestSelector from '@/components/booking/GuestSelector';
import PriceBreakdown from '@/components/booking/PriceBreakdown';
import Button from '@/components/ui/Button';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

export default function BookingCard({ listing, blockedDates = [], onBookingComplete }) {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [guests, setGuests] = useState({ adults: 1, children: 0, infants: 0, total: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const pricePerUnit = listing.listingType === 'long_term' ? listing.pricePerMonth : listing.pricePerNight;

  function handleDateChange({ checkIn: ci, checkOut: co }) {
    setCheckIn(ci);
    setCheckOut(co);
    setError(null);
    if (ci && co) setShowDatePicker(false);
  }

  function handleGuestChange(data) { setGuests(data); }

  const calculateEstimate = useCallback(() => {
    if (!checkIn || !checkOut || !pricePerUnit) return null;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    let baseAmount;
    if (listing.listingType === 'long_term') {
      baseAmount = pricePerUnit * Math.ceil(nights / 30);
    } else {
      baseAmount = pricePerUnit * nights;
    }
    const cleaningFee = parseFloat(listing.cleaningFee) || 0;
    const securityDeposit = parseFloat(listing.securityDeposit) || 0;
    const serviceFee = Math.min(Math.max(Math.round(baseAmount * 0.05), 100), 5000);
    const totalAmount = baseAmount + cleaningFee + serviceFee;
    return { baseAmount, cleaningFee, serviceFee, securityDeposit, discountAmount: 0, totalAmount, nights };
  }, [checkIn, checkOut, pricePerUnit, listing]);

  async function handleBooking() {
    if (!checkIn || !checkOut) { setError('Please select dates.'); return; }
    setIsLoading(true); setError(null);
    try {
      const response = await apiClient.post('/bookings', {
        listingId: listing.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestCount: guests.total,
        bookingType: listing.listingType === 'both' ? 'short_term' : listing.listingType,
      });
      if (onBookingComplete) onBookingComplete(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  const estimate = calculateEstimate();

  return (
    <div className="booking-card">
      <div className="booking-card__header">
        <span className="booking-card__price">
          <strong>{constants.CURRENCY_SYMBOL} {pricePerUnit?.toLocaleString()}</strong>
          <span className="booking-card__price-unit">/{listing.listingType === 'long_term' ? 'month' : 'night'}</span>
        </span>
      </div>
      <div className="booking-card__section">
        <button className="booking-card__date-trigger" onClick={() => setShowDatePicker(!showDatePicker)} type="button">
          <span>{checkIn && checkOut ? `${checkIn} - ${checkOut}` : 'Select dates'}</span>
        </button>
        {showDatePicker && (
          <div className="booking-card__date-picker">
            <DatePicker checkIn={checkIn} checkOut={checkOut} onDateChange={handleDateChange} blockedDates={blockedDates} />
          </div>
        )}
      </div>
      <div className="booking-card__section">
        <GuestSelector maxGuests={listing.maxGuests} onChange={handleGuestChange} />
      </div>
      {estimate && (
        <div className="booking-card__section">
          <PriceBreakdown pricing={estimate} pricePerUnit={pricePerUnit} compact />
        </div>
      )}
      <div className="booking-card__actions">
        {error && <div className="booking-card__error">{error}</div>}
        <Button variant="primary" size="lg" fullWidth isLoading={isLoading} onClick={handleBooking} disabled={!checkIn || !checkOut}>
          {checkIn && checkOut ? 'Request to Book' : 'Select Dates to Book'}
        </Button>
      </div>
    </div>
  );
}
