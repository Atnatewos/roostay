// frontend/components/listing/ListingSearch.jsx
// Search bar component with city dropdown and date range
// Provides the primary search interface for finding listings

'use client';

const { useState } = require('react');
const Button = require('@components/ui/Button').default;
const constants = require('@lib/constants');

/**
 * Main search bar component for the ROOSTAY platform.
 * Supports text search, city selection, and listing type filter.
 * Triggers navigation to search results on submit.
 *
 * @param {Object} props
 * @param {Object} [props.initialValues] - Initial search values
 * @param {Function} [props.onSearch] - Custom search handler (overrides default navigation)
 * @param {boolean} [props.compact=false] - Compact display mode for header placement
 */
function ListingSearch({ initialValues = {}, onSearch, compact = false }) {
  const [search, setSearch] = useState(initialValues.search || '');
  const [city, setCity] = useState(initialValues.city || '');
  const [listingType, setListingType] = useState(initialValues.listingType || '');

  /**
   * Handles form submission.
   * Either calls the custom onSearch handler or navigates to search page.
   *
   * @param {Event} e - Form submit event
   */
  function handleSubmit(e) {
    e.preventDefault();

    if (onSearch) {
      onSearch({ search, city, listingType: listingType || undefined });
      return;
    }

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    if (listingType) params.set('listingType', listingType);

    window.location.href = `/search?${params.toString()}`;
  }

  const containerClass = `listing-search ${compact ? 'listing-search--compact' : ''}`;

  return (
    <form className={containerClass} onSubmit={handleSubmit}>
      <div className="listing-search__inputs">
        {/* Text Search */}
        <div className="listing-search__field">
          <label htmlFor="search-query" className="sr-only">Search</label>
          <svg className="listing-search__field-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="search-query"
            type="text"
            className="input listing-search__input"
            placeholder="Search by name, city, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* City Select */}
        {!compact && (
          <div className="listing-search__field">
            <label htmlFor="search-city" className="sr-only">City</label>
            <svg className="listing-search__field-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <select
              id="search-city"
              className="input input--select listing-search__input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">All Cities</option>
              {constants.CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Listing Type */}
        {!compact && (
          <div className="listing-search__field">
            <label htmlFor="search-type" className="sr-only">Stay Type</label>
            <svg className="listing-search__field-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <select
              id="search-type"
              className="input input--select listing-search__input"
              value={listingType}
              onChange={(e) => setListingType(e.target.value)}
            >
              <option value="">All Types</option>
              {constants.LISTING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Button type="submit" variant="primary" size={compact ? 'md' : 'lg'}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Search
      </Button>
    </form>
  );
}

module.exports = ListingSearch;