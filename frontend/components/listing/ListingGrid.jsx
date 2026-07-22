// frontend/components/listing/ListingGrid.jsx
// Responsive grid layout for displaying premium listing cards
// Uses explicit inline styles to guarantee grid layout
import ListingCard from '@/components/listing/ListingCard';
import Skeleton from '@/components/ui/Skeleton';

export default function ListingGrid({
  listings = [],
  isLoading = false,
  emptyMessage = 'No listings found.',
  skeletonCount = 6,
}) {
  // Loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
      }}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div key={index} className="premium-skeleton">
            <div className="premium-skeleton__image" />
            <div className="premium-skeleton__content">
              <div className="premium-skeleton__line premium-skeleton__line--title" />
              <div className="premium-skeleton__line" />
              <div className="premium-skeleton__line premium-skeleton__line--short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!listings || listings.length === 0) {
    return (
      <div className="premium-listings-empty">
        <div className="premium-listings-empty__icon">🏠</div>
        <h3 className="premium-listings-empty__title">No listings found</h3>
        <p className="premium-listings-empty__text">{emptyMessage}</p>
      </div>
    );
  }

  // Listings grid - with EXPLICIT inline styles to guarantee grid layout
  return (
    <div 
      className="premium-listings-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
        width: '100%',
      }}
    >
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          showFavorite={true}
          imageCount={listing.images?.length || 1}
          activeImage={0}
        />
      ))}
    </div>
  );
}