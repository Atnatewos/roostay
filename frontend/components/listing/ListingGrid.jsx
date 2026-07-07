// frontend/components/listing/ListingGrid.jsx
// Responsive grid layout for displaying listing cards
// Adapts from 1 to 4 columns based on viewport width

const ListingCard = require('@components/listing/ListingCard').default;
const Skeleton = require('@components/ui/Skeleton').default;

/**
 * Responsive grid component for displaying listing cards.
 * Shows loading skeletons when data is being fetched.
 * Displays an empty state message when no listings are found.
 *
 * @param {Object} props
 * @param {Array} props.listings - Array of listing objects to display
 * @param {boolean} [props.isLoading=false] - Whether listings are being loaded
 * @param {string} [props.emptyMessage='No listings found.'] - Message when listings array is empty
 * @param {number} [props.skeletonCount=6] - Number of skeleton cards to show while loading
 */
function ListingGrid({
  listings = [],
  isLoading = false,
  emptyMessage = 'No listings found.',
  skeletonCount = 6,
}) {
  // Loading state
  if (isLoading) {
    return (
      <div className="listing-grid">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <Skeleton key={index} type="card" />
        ))}
      </div>
    );
  }

  // Empty state
  if (!listings || listings.length === 0) {
    return (
      <div className="listing-grid__empty">
        <div className="listing-grid__empty-icon">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <p className="listing-grid__empty-text">{emptyMessage}</p>
      </div>
    );
  }

  // Listings grid
  return (
    <div className="listing-grid">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

module.exports = ListingGrid;