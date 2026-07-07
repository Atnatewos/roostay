import constants from '@/lib/constants';

export default function PriceBreakdown({ pricing, nights, pricePerUnit, bookingType = 'short_term', compact = false }) {
  if (!pricing) return <div className="price-breakdown price-breakdown--empty"><p>Select dates to see pricing.</p></div>;
  const { baseAmount = 0, cleaningFee = 0, serviceFee = 0, securityDeposit = 0, discountAmount = 0, totalAmount = 0 } = pricing;
  const fmt = (a) => `${constants.CURRENCY_SYMBOL} ${a.toLocaleString()}`;

  return (
    <div className={`price-breakdown ${compact ? 'price-breakdown--compact' : ''}`}>
      {!compact && <h3 className="price-breakdown__title">Price Breakdown</h3>}
      <div className="price-breakdown__items">
        {pricePerUnit && <div className="price-breakdown__row"><span className="price-breakdown__label">{fmt(pricePerUnit)} x {nights||1} night{(nights||1)!==1?'s':''}</span><span className="price-breakdown__value">{fmt(baseAmount)}</span></div>}
        {discountAmount > 0 && <div className="price-breakdown__row price-breakdown__row--discount"><span className="price-breakdown__label">Discount</span><span className="price-breakdown__value">-{fmt(discountAmount)}</span></div>}
        {cleaningFee > 0 && <div className="price-breakdown__row"><span className="price-breakdown__label">Cleaning fee</span><span className="price-breakdown__value">{fmt(cleaningFee)}</span></div>}
        {serviceFee > 0 && <div className="price-breakdown__row"><span className="price-breakdown__label">Service fee</span><span className="price-breakdown__value">{fmt(serviceFee)}</span></div>}
      </div>
      <div className="price-breakdown__total"><span className="price-breakdown__total-label">Total</span><span className="price-breakdown__total-value">{fmt(totalAmount)}</span></div>
    </div>
  );
}
