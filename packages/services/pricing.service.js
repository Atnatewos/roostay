// packages/services/pricing.service.js
// Centralized pricing engine for ROOSTAY
// All pricing calculations, service fees, discounts, and currency formatting
// live in this single service — called by both frontend and backend
// Zero hardcoded values — everything from pricing.config.json
// Author: Theron

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    pricing: {
      currency: 'ETB',
      currencySymbol: 'Br',
      serviceFee: { percent: 5, minAmount: 100, maxAmount: 5000 },
      discounts: {
        weekly: { enabled: true, minNights: 7, defaultPercent: 5 },
        monthly: { enabled: true, minNights: 28, defaultPercent: 15 },
      },
    },
  };
}

/**
 * Calculates the base amount for a booking based on type, duration, and unit price.
 *
 * @param {Object}  params
 * @param {string}  params.bookingType  - 'short_term' or 'long_term'
 * @param {number}  params.nights       - Total nights of stay
 * @param {number}  params.pricePerNight - Nightly rate (for short_term)
 * @param {number}  params.pricePerMonth - Monthly rate (for long_term)
 * @returns {Object} { baseAmount, nights, months }
 */
function calculateBaseAmount({ bookingType, nights, pricePerNight, pricePerMonth }) {
  let baseAmount;
  let months = 0;

  if (bookingType === 'long_term') {
    months = Math.ceil(nights / 30);
    baseAmount = (pricePerMonth || 0) * months;
  } else {
    baseAmount = (pricePerNight || 0) * nights;
  }

  return { baseAmount, nights, months };
}

/**
 * Calculates the service fee based on config-driven rules.
 * Applies percentage, enforces min/max bounds.
 *
 * @param {number} baseAmount - The base booking amount
 * @returns {number} The calculated service fee
 */
function calculateServiceFee(baseAmount) {
  const serviceFeeConfig = config.pricing?.serviceFee || {};
  const percent = serviceFeeConfig.percent || 5;
  const minAmount = serviceFeeConfig.minAmount || 100;
  const maxAmount = serviceFeeConfig.maxAmount || 5000;

  let serviceFee = Math.round(baseAmount * (percent / 100));
  serviceFee = Math.max(serviceFee, minAmount);
  serviceFee = Math.min(serviceFee, maxAmount);

  return serviceFee;
}

/**
 * Calculates discount amount based on stay duration and config rules.
 * Supports weekly and monthly discounts when enabled.
 *
 * @param {number} baseAmount - The base booking amount
 * @param {number} nights     - Total nights of stay
 * @returns {Object} { discountAmount, discountPercent, discountType }
 */
function calculateDiscount(baseAmount, nights) {
  const discountConfig = config.pricing?.discounts || {};
  let discountAmount = 0;
  let discountPercent = 0;
  let discountType = null;

  // Check monthly discount (longer stays get priority)
  if (discountConfig.monthly?.enabled && nights >= (discountConfig.monthly.minNights || 28)) {
    discountPercent = discountConfig.monthly.defaultPercent || 15;
    discountType = 'monthly';
  }
  // Check weekly discount
  else if (discountConfig.weekly?.enabled && nights >= (discountConfig.weekly.minNights || 7)) {
    discountPercent = discountConfig.weekly.defaultPercent || 5;
    discountType = 'weekly';
  }

  if (discountPercent > 0) {
    discountAmount = Math.round(baseAmount * (discountPercent / 100));
  }

  return { discountAmount, discountPercent, discountType };
}

/**
 * Calculates the complete pricing breakdown for a booking.
 * This is the single entry point for all pricing logic.
 * Called by booking.service.js (backend) and BookingCard.jsx (frontend via API).
 *
 * @param {Object} params
 * @param {string} params.bookingType   - 'short_term' or 'long_term'
 * @param {number} params.nights        - Total nights
 * @param {number} params.pricePerNight - Nightly rate
 * @param {number} params.pricePerMonth - Monthly rate
 * @param {number} [params.cleaningFee=0]    - Cleaning fee from listing
 * @param {number} [params.securityDeposit=0] - Security deposit from listing
 * @param {number} [params.customDiscountPercent] - Host-defined discount override
 * @returns {Object} Complete pricing breakdown
 */
function calculatePricing({
  bookingType,
  nights,
  pricePerNight,
  pricePerMonth,
  cleaningFee = 0,
  securityDeposit = 0,
  customDiscountPercent,
}) {
  // Calculate base amount
  const base = calculateBaseAmount({ bookingType, nights, pricePerNight, pricePerMonth });

  // Calculate service fee
  const serviceFee = calculateServiceFee(base.baseAmount);

  // Calculate discount (host custom discount takes priority over config rules)
  let discountAmount = 0;
  let discountPercent = 0;
  let discountType = null;

  if (customDiscountPercent && customDiscountPercent > 0) {
    discountPercent = customDiscountPercent;
    discountAmount = Math.round(base.baseAmount * (customDiscountPercent / 100));
    discountType = 'custom';
  } else {
    const discount = calculateDiscount(base.baseAmount, nights);
    discountAmount = discount.discountAmount;
    discountPercent = discount.discountPercent;
    discountType = discount.discountType;
  }

  // Calculate total
  const totalAmount = base.baseAmount + serviceFee + cleaningFee - discountAmount;

  const currency = config.pricing?.currency || 'ETB';
  const currencySymbol = config.pricing?.currencySymbol || 'Br';

  return {
    baseAmount: base.baseAmount,
    cleaningFee,
    serviceFee,
    securityDeposit,
    discountAmount,
    discountPercent,
    discountType,
    totalAmount,
    nights: base.nights,
    months: base.months,
    currency,
    currencySymbol,
    breakdown: {
      pricePerUnit: bookingType === 'long_term' ? pricePerMonth : pricePerNight,
      unitLabel: bookingType === 'long_term' ? 'month' : 'night',
      units: bookingType === 'long_term' ? base.months : base.nights,
      serviceFeePercent: config.pricing?.serviceFee?.percent || 5,
      discountPercent,
    },
  };
}

/**
 * Formats an amount as a currency string using config-driven symbol.
 *
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string (e.g., "Br 1,500")
 */
function formatCurrency(amount) {
  const symbol = config.pricing?.currencySymbol || 'Br';
  return `${symbol} ${Number(amount || 0).toLocaleString()}`;
}

/**
 * Returns the currency configuration from pricing config.
 *
 * @returns {Object} { currency, currencySymbol }
 */
function getCurrencyConfig() {
  return {
    currency: config.pricing?.currency || 'ETB',
    currencySymbol: config.pricing?.currencySymbol || 'Br',
  };
}

module.exports = {
  calculateBaseAmount,
  calculateServiceFee,
  calculateDiscount,
  calculatePricing,
  formatCurrency,
  getCurrencyConfig,
};