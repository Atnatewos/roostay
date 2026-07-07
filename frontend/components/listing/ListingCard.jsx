// frontend/components/listing/ListingCard.jsx
// Listing card component for displaying property previews in grids
// Shows primary image, title, location, price, rating, and favorite button

'use client';

const Link = require('next/link').default;
const Badge = require('@components/ui/Badge').default;
const StarRating = require('@components/ui/StarRating').default;
const { apiClient } = require('@lib/api');
const constants = require('@lib/constants');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = { features: { ui: { imagePlaceholder: '/images/placeholder-listing.svg' } } };
}

/**
 * Displays a property listing as a card in search results and favorites.
 * Shows primary image with overlay badges, pricing, rating, and location.
 * Clicking navigates to the full listing detail page.
 *
 * @param {Object} props
 * @param {Object} props.listing - Listing data object from the API
 * @param {boolean} [props.showFavorite=true] - Whether to show favorite toggle
 */
function ListingCard({ listing, showFavorite = true }) {
  const placeholderImage = config.features?.ui?.imagePlaceholder || '/images/placeholder-listing.svg';

  const priceDisplay = listing.listingType === 'long_term'
    ? `${listing.pricePerMonth?.toLocaleString()} ${constants.CURRENCY_SYMBOL}/month`
    : `${listing.pricePerNight?.toLocaleString()} ${constants.CURRENCY_SYMBOL}/night`;

  return (
    <div className="listing-card">
      <Link href={`/listings/${listing.id}`} className="listing-card__link">
        {/* Image Section */}
        <div className="listing-card__image-wrapper">
          <img
            src={listing.primaryImage || placeholderImage}
            alt={listing.title}
            className="listing-card__image"
            loading="lazy"
            onError={(e) => {
              e.target.src = placeholderImage;
            }}
          />

          {/* Type Badge */}
          <div className="listing-card__badges">
            <Badge variant={listing.listingType === 'short_term' ? 'primary' : 'info'} size="sm">
              {listing.listingType === 'short_term' ? 'Short Stay' : 'Long Stay'}
            </Badge>
            {listing.instantBook && (
              <Badge variant="success" size="sm">Instant Book</Badge>
            )}
          </div>

          {/* Favorite Button */}
          {showFavorite && (
            <button
              className="listing-card__favorite"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFavoriteToggle(listing.id);
              }}
              aria-label="Toggle favorite"
            >
              <svg
                className="listing-card__favorite-icon"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
        </div>

        {/* Content Section */}
        <div className="listing-card__content">
          <div className="listing-card__header">
            <h3 className="listing-card__title">{listing.title}</h3>
            {listing.rating && (
              <div className="listing-card__rating">
                <StarRating rating={listing.rating} size="sm" />
                <span className="listing-card__rating-value">{listing.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <p className="listing-card__location">
            <svg className="listing-card__location-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {listing.location?.city || listing.city}
            {listing.location?.subcity ? `, ${listing.location.subcity}` : ''}
          </p>

          <div className="listing-card__details">
            <span className="listing-card__detail">
              {listing.bedrooms} {listing.bedrooms === 1 ? 'bed' : 'beds'}
            </span>
            <span className="listing-card__detail-separator">&middot;</span>
            <span className="listing-card__detail">
              {listing.bathrooms} {listing.bathrooms === 1 ? 'bath' : 'baths'}
            </span>
            <span className="listing-card__detail-separator">&middot;</span>
            <span className="listing-card__detail">
              Up to {listing.maxGuests} guests
            </span>
          </div>

          <div className="listing-card__footer">
            <span className="listing-card__price">
              <strong>{priceDisplay}</strong>
            </span>
            {listing.totalReviews > 0 && (
              <span className="listing-card__reviews">
                {listing.totalReviews} {listing.totalReviews === 1 ? 'review' : 'reviews'}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

/**
 * Handles favorite toggle for a listing.
 * Makes API call and updates the UI accordingly.
 *
 * @param {string} listingId - The listing ID to toggle
 */
async function handleFavoriteToggle(listingId) {
  try {
    await apiClient.post(`/favorites/${listingId}`);
  } catch (error) {
    console.error('Failed to toggle favorite:', error.message);
  }
}

module.exports = ListingCard;