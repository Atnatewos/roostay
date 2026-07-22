// frontend/components/listing/ListingSearch.jsx
// Premium pill-shaped search bar for listings
// Supports compact mode for header and full mode for search page
// Uses premium CSS classes for modern Airbnb-style design

'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

const CITIES = ['Addis Ababa','Adama','Bahir Dar','Dire Dawa','Gondar','Hawassa','Jimma','Mekelle','Shashamane'];

/**
 * Premium search component with pill-shaped design.
 * Supports compact mode for header placement and full mode for search pages.
 *
 * @param {Object} props
 * @param {Object} props.initialValues - Initial search values { search, city }
 * @param {Function} [props.onSearch] - Callback when search is submitted
 * @param {boolean} [props.compact=false] - Whether to use compact mode
 */
export default function ListingSearch({ initialValues = {}, onSearch, compact = false }) {
  const [search, setSearch] = useState(initialValues.search || '');
  const [city, setCity] = useState(initialValues.city || '');

  function handleSubmit(e) {
    e.preventDefault();
    
    // Use custom handler if provided
    if (onSearch) {
      onSearch({ search, city });
      return;
    }
    
    // Default behavior: redirect to search page with query params
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    window.location.href = '/search?' + params.toString();
  }

  return (
    <form 
      className={`premium-search-bar ${compact ? 'premium-search-bar--compact' : 'premium-search-bar--full'}`} 
      onSubmit={handleSubmit}
    >
      {/* Where Section - Location Search */}
      <div className="premium-search-bar__section premium-search-bar__section--where">
        <label className="premium-search-bar__label">Where</label>
        <span className={`premium-search-bar__value ${search ? 'premium-search-bar__value--selected' : ''}`}>
          {search || 'Search destinations'}
        </span>
        <input 
          type="text" 
          className="premium-search-bar__input"
          placeholder="Search by name, city, or keyword..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search destinations"
        />
      </div>

      {/* When Section - Check-in (placeholder for future implementation) */}
      {!compact && (
        <div className="premium-search-bar__section">
          <label className="premium-search-bar__label">Check in</label>
          <span className="premium-search-bar__value">Add dates</span>
        </div>
      )}

      {/* When Section - Check-out (placeholder for future implementation) */}
      {!compact && (
        <div className="premium-search-bar__section">
          <label className="premium-search-bar__label">Check out</label>
          <span className="premium-search-bar__value">Add dates</span>
        </div>
      )}

      {/* Who Section - City Selection + Search Button */}
      <div className="premium-search-bar__section premium-search-bar__section--guests">
        <div>
          <label className="premium-search-bar__label">
            {compact ? 'City' : 'Who'}
          </label>
          <select 
            className={`premium-search-bar__select ${city ? 'premium-search-bar__value--selected' : ''}`}
            value={city} 
            onChange={(e) => setCity(e.target.value)}
            aria-label="Select city"
          >
            <option value="">All Cities</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        
        {/* Search Button */}
        <button 
          type="submit" 
          className="premium-search-bar__button"
          aria-label="Search"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          {!compact && <span className="premium-search-bar__button-text">Search</span>}
        </button>
      </div>
    </form>
  );
}