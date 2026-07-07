'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'condo', label: 'Condo' },
  { value: 'guest_house', label: 'Guest House' },
  { value: 'shared_room', label: 'Shared Room' },
  { value: 'serviced_apartment', label: 'Serviced Apartment' },
];

export default function ListingFilter({ filters = {}, onFilterChange, onApply, onReset, isOpen = true }) {
  const [priceRange, setPriceRange] = useState({ min: filters.minPrice || '', max: filters.maxPrice || '' });

  function handleChange(key, value) {
    if (key === 'minPrice' || key === 'maxPrice') {
      const updated = { ...priceRange, [key]: value };
      setPriceRange(updated);
      onFilterChange({ ...filters, minPrice: updated.min, maxPrice: updated.max });
    } else {
      onFilterChange({ ...filters, [key]: value });
    }
  }

  function handleReset() {
    setPriceRange({ min: '', max: '' });
    if (onReset) onReset();
    else onFilterChange({});
  }

  if (!isOpen) return null;

  return (
    <div className="listing-filter">
      <div className="listing-filter__header">
        <h3 className="listing-filter__title">Filters</h3>
        <button className="listing-filter__reset" onClick={handleReset}>Reset All</button>
      </div>
      <div className="listing-filter__section">
        <label className="listing-filter__label">Price Range (Br)</label>
        <div className="listing-filter__price-inputs">
          <input type="number" className="input input--sm" placeholder="Min" value={priceRange.min} onChange={(e) => handleChange('minPrice', e.target.value)} min="0" />
          <span className="listing-filter__price-separator">to</span>
          <input type="number" className="input input--sm" placeholder="Max" value={priceRange.max} onChange={(e) => handleChange('maxPrice', e.target.value)} min="0" />
        </div>
      </div>
      <div className="listing-filter__section">
        <label className="listing-filter__label">Property Type</label>
        <select className="input input--select input--sm" value={filters.propertyType || ''} onChange={(e) => handleChange('propertyType', e.target.value || undefined)}>
          <option value="">All Types</option>
          {PROPERTY_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
        </select>
      </div>
      <div className="listing-filter__section">
        <label className="listing-filter__label">Bedrooms</label>
        <select className="input input--select input--sm" value={filters.bedrooms || ''} onChange={(e) => handleChange('bedrooms', e.target.value ? parseInt(e.target.value) : undefined)}>
          <option value="">Any</option>
          {[1,2,3,4,5].map((n) => (<option key={n} value={n}>{n}+ bedrooms</option>))}
        </select>
      </div>
      {onApply && (
        <div className="listing-filter__actions">
          <Button variant="primary" fullWidth onClick={onApply}>Apply Filters</Button>
        </div>
      )}
    </div>
  );
}
