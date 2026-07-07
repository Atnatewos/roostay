// frontend/components/listing/AmenitiesList.jsx
// Displays a grid of property amenities with icons and categories
// Supports collapsible view with "show all" toggle for long lists

'use client';

const { useState } = require('react');

/**
 * Maps amenity names to SVG icon paths for consistent display.
 * Icons are simple, recognizable representations of each amenity.
 */
const AMENITY_ICONS = {
  wifi: {
    label: 'WiFi',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>,
  },
  kitchen: {
    label: 'Kitchen',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  },
  tv: {
    label: 'TV',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  },
  ac: {
    label: 'Air Conditioning',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 8h.01M16 8h.01M12 8h.01M8 12h.01M16 12h.01M12 16h.01"/></svg>,
  },
  parking: {
    label: 'Parking',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>,
  },
  pool: {
    label: 'Pool',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M5 12c2-3 4-3 6 0s4 3 6 0"/><path d="M8 6c2-4 4-4 6 0"/></svg>,
  },
  laundry: {
    label: 'Laundry',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="22" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 7h.01M12 7h.01M16 7h.01M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  },
  security: {
    label: 'Security',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
  garden: {
    label: 'Garden',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18"/><path d="M8 7c0-2 2-4 4-4s4 2 4 4"/><path d="M4 11c2-2 4-2 8 0s6-2 8 0"/></svg>,
  },
  gym: {
    label: 'Gym',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 6.5h11v11h-11z"/><rect x="2" y="9" width="4" height="6" rx="1"/><rect x="18" y="9" width="4" height="6" rx="1"/></svg>,
  },
  balcony: {
    label: 'Balcony',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="9" width="18" height="12" rx="1"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="7" y1="9" x2="7" y2="21"/><line x1="17" y1="9" x2="17" y2="21"/></svg>,
  },
  elevator: {
    label: 'Elevator',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="2" width="12" height="20" rx="2"/><polyline points="10 6 12 4 14 6"/><polyline points="10 18 12 20 14 18"/><line x1="12" y1="4" x2="12" y2="16"/></svg>,
  },
  pet_friendly: {
    label: 'Pet Friendly',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="14" r="2"/><circle cx="16" cy="14" r="2"/><path d="M12 8c-1.5 0-3 .5-4 2l-2 4h12l-2-4c-1-1.5-2.5-2-4-2z"/></svg>,
  },
  workspace: {
    label: 'Workspace',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  },
  heating: {
    label: 'Heating',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>,
  },
  default: {
    label: '',
    svg: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  },
};

/**
 * Amenities grid component for listing detail pages.
 * Shows up to 6 amenities by default with a "Show all" toggle.
 * Groups amenities by category when available.
 *
 * @param {Object} props
 * @param {Array} props.amenities - Array of amenity objects { amenity_name, category, icon_name }
 * @param {number} [props.maxVisible=6] - Number of amenities to show before collapsing
 */
function AmenitiesList({ amenities = [], maxVisible = 6 }) {
  const [showAll, setShowAll] = useState(false);

  if (!amenities || amenities.length === 0) {
    return (
      <div className="amenities-list amenities-list--empty">
        <p>No amenities listed for this property.</p>
      </div>
    );
  }

  const displayAmenities = showAll ? amenities : amenities.slice(0, maxVisible);
  const hasMore = amenities.length > maxVisible;

  /**
   * Retrieves the icon component for a given amenity.
   * Falls back to the default checkmark icon if no match is found.
   *
   * @param {string} iconName - The icon identifier
   * @returns {Object} Icon object with label and SVG element
   */
  function getAmenityIcon(iconName) {
    if (!iconName) return AMENITY_ICONS.default;
    const key = iconName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return AMENITY_ICONS[key] || { ...AMENITY_ICONS.default, label: iconName };
  }

  // Group amenities by category if categories exist
  const hasCategories = amenities.some((a) => a.category);
  const grouped = hasCategories
    ? amenities.reduce((acc, amenity) => {
        const cat = amenity.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(amenity);
        return acc;
      }, {})
    : { '': amenities };

  return (
    <div className="amenities-list">
      {hasCategories ? (
        // Categorized display
        Object.entries(grouped).map(([category, items]) => {
          const visibleItems = showAll ? items : items.slice(0, maxVisible);

          return (
            <div key={category} className="amenities-list__category">
              {category && <h4 className="amenities-list__category-title">{category}</h4>}
              <div className="amenities-list__grid">
                {visibleItems.map((amenity, index) => {
                  const icon = getAmenityIcon(amenity.icon_name || amenity.amenity_name);
                  return (
                    <div key={index} className="amenities-list__item">
                      <span className="amenities-list__icon">{icon.svg}</span>
                      <span className="amenities-list__name">
                        {amenity.amenity_name || icon.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        // Simple grid without categories
        <div className="amenities-list__grid">
          {displayAmenities.map((amenity, index) => {
            const icon = getAmenityIcon(amenity.icon_name || amenity.amenity_name);
            return (
              <div key={index} className="amenities-list__item">
                <span className="amenities-list__icon">{icon.svg}</span>
                <span className="amenities-list__name">
                  {amenity.amenity_name || icon.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Show All / Show Less Toggle */}
      {hasMore && (
        <button
          className="amenities-list__toggle"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll
            ? 'Show less'
            : `Show all ${amenities.length} amenities`
          }
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`amenities-list__toggle-icon ${showAll ? 'amenities-list__toggle-icon--up' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  );
}

module.exports = AmenitiesList;