// frontend/components/listing/ListingFilter.jsx
// Filter panel for listing search with expandable sections
// Supports filtering by price range, property type, amenities, and more

'use client';

const { useState } = require('react');
const Button = require('@components/ui/Button').default;
const constants = require('@lib/constants');

/**
 * Advanced filter panel for property listing search.
 * Provides filter controls for price range, property type,
 * listing type, bedrooms, bathrooms, and instant book.
 *
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Callback when filters change
 * @param {Function} [props.onApply] - Callback when apply button is clicked
 * @param {Function} [props.onReset] - Callback to reset all filters
 * @param {boolean} [props.isOpen=true] - Whether the filter panel is visible
 */
function ListingFilter({
  filters = {},
  onFilterChange,
  onApply,
  onReset,
  isOpen = true,
}) {
  const [priceRange, setPriceRange] = useState({
    min: filters.minPrice || '',
    max: filters.maxPrice || '',
  });

  /**
   * Updates a specific filter value and notifies parent.
   *
   * @param {string} key - Filter key to update
   * @param {*} value - New filter value
   */
  function handleChange(key, value) {
    if (key === 'minPrice' || key === 'maxPrice') {
      const updated = { ...priceRange, [key]: value };
      setPriceRange(updated);
      onFilterChange({ ...filters, minPrice: updated.min, maxPrice: updated.max });
    } else {
      onFilterChange({ ...filters, [key]: value });
    }
  }

  /**
   * Resets all filters to default values.
   */
  function handleReset() {
    setPriceRange({ min: '', max: '' });
    if (onReset) {
      onReset();
    } else {
      onFilterChange({});
    }
  }

  if (!isOpen) return null;

  return (
    <div className="listing-filter">
      <div className="listing-filter__header">
        <h3 className="listing-filter__title">Filters</h3>
        <button className="listing-filter__reset" onClick={handleReset}>
          Reset All
        </button>
      </div>

      {/* Listing Type */}
      <div className="listing-filter__section">
        <label className="listing-filter__label">Stay Type</label>
        <div className="listing-filter__options">
          {constants.LISTING_TYPES.map((type) => (
            <button
              key={type.value}
              className={`listing-filter__chip ${filters.listingType === type.value ? 'listing-filter__chip--active' : ''}`}
              onClick={() => handleChange('listingType', filters.listingType === type.value ? undefined : type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="listing-filter__section">
        <label className="listing-filter__label">
          Price Range ({constants.CURRENCY_SYMBOL})
        </label>
        <div className="listing-filter__price-inputs">
          <input
            type="number"
            className="input input--sm"
            placeholder="Min"
            value={priceRange.min}
            onChange={(e) => handleChange('minPrice', e.target.value)}
            min="0"
          />
          <span className="listing-filter__price-separator">to</span>
          <input
            type="number"
            className="input input--sm"
            placeholder="Max"
            value={priceRange.max}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
            min="0"
          />
        </div>
      </div>

      {/* Property Type */}
      <div className="listing-filter__section">
        <label className="listing-filter__label">Property Type</label>
        <select
          className="input input--select input--sm"
          value={filters.propertyType || ''}
          onChange={(e) => handleChange('propertyType', e.target.value || undefined)}
        >
          <option value="">All Types</option>
          {constants.PROPERTY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Bedrooms */}
      <div className="listing-filter__section">
        <label className="listing-filter__label">Bedrooms</label>
        <select
          className="input input--select input--sm"
          value={filters.bedrooms || ''}
          onChange={(e) => handleChange('bedrooms', e.target.value ? parseInt(e.target.value, 10) : undefined)}
        >
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}+ bedrooms</option>
          ))}
        </select>
      </div>

      {/* Bathrooms */}
      <div className="listing-filter__section">
        <label className="listing-filter__label">Bathrooms</label>
        <select
          className="input input--select input--sm"
          value={filters.bathrooms || ''}
          onChange={(e) => handleChange('bathrooms', e.target.value ? parseInt(e.target.value, 10) : undefined)}
        >
          <option value="">Any</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{n}+ bathrooms</option>
          ))}
        </select>
      </div>

      {/* Instant Book */}
      <div className="listing-filter__section">
        <label className="listing-filter__checkbox">
          <input
            type="checkbox"
            checked={filters.instantBook || false}
            onChange={(e) => handleChange('instantBook', e.target.checked || undefined)}
          />
          <span>Instant Book only</span>
        </label>
      </div>

      {/* Apply Button */}
      {onApply && (
        <div className="listing-filter__actions">
          <Button variant="primary" fullWidth onClick={onApply}>
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
}

module.exports = ListingFilter;