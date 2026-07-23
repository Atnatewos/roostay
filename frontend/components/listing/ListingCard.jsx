// frontend/components/listing/ListingCard.jsx
// Property preview card component for listing grids
// Premium vertical layout — only grid-critical dimensions use inline styles
// All other styling comes from premium-listings.css for clean separation
// Features animated heart burst, social proof saved count, 1:1 aspect ratio
// Author: Theron
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import constants from '@/lib/constants';

const PLACEHOLDER = '/images/placeholder-listing.svg';

/**
 * Premium listing card — grid-critical dimensions are inline to prevent
 * CSS cascade conflicts across the platform. All decorative styles,
 * animations, hover states, and typography live in premium-listings.css.
 *
 * @param {Object}    props
 * @param {Object}    props.listing        - Listing data object
 * @param {boolean}   [props.showFavorite]  - Whether to show favorite heart
 * @param {Function}  [props.onToggle]      - Callback on favorite state change
 */
export default function ListingCard({
  listing,
  showFavorite = true,
  onToggle,
}) {
  // Initialize favorite state — check multiple possible fields from different API endpoints
  const [isFavorited, setIsFavorited] = useState(
    listing.isFavorited ||
    listing.is_favorited ||
    listing.isFavourite ||
    listing.is_favourite ||
    false
  );

  const [isAnimating, setIsAnimating] = useState(false);

  // Resolve image with multi-field fallback
  const rawImageUrl =
    listing.primaryImage || listing.primary_image || listing.image_url;
  const displayImage = rawImageUrl || PLACEHOLDER;

  // Resolve listing type and pricing
  const listingType = listing.listingType || listing.listing_type;
  const pricePerNight = listing.pricePerNight || listing.price_per_night || 0;
  const pricePerMonth = listing.pricePerMonth || listing.price_per_month || 0;

  const priceDisplay =
    listingType === 'long_term'
      ? `${constants.CURRENCY_SYMBOL} ${pricePerMonth.toLocaleString()}`
      : `${constants.CURRENCY_SYMBOL} ${pricePerNight.toLocaleString()}`;

  const pricePeriod = listingType === 'long_term' ? 'month' : 'night';

  // Resolve rating
  const rating =
    listing.reviews?.avgRating || listing.reviews?.avg_rating || 0;

  // Resolve location
  const location = listing.city || listing.location?.city || '';
  const sublocation = listing.subcity || listing.location?.subcity || '';

  // Social proof — how many users have saved this listing
  const savedCount = listing.favoriteCount || listing.favorite_count || 0;

  /**
   * Toggles favorite state for this listing.
   * Triggers a heart burst animation on the like action.
   */
  async function handleFavoriteToggle(e) {
    e.preventDefault();
    e.stopPropagation();

    try {
      await apiClient.post(`/favorites/${listing.id}`);
      const newState = !isFavorited;
      setIsFavorited(newState);

      if (newState) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);
      }

      if (onToggle) {
        onToggle(listing.id, newState);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err.message);
    }
  }

  return (
    <div
      className="premium-listing-card"
      style={{
        width: '100%',
        minWidth: '0',
        maxWidth: '100%',
      }}
    >
      <Link
        href={`/listings/${listing.id}`}
        className="premium-listing-card__link"
      >
        {/* Image Container — 1:1 aspect ratio enforced inline */}
        <div
          className="premium-listing-card__image-wrapper"
          style={{
            aspectRatio: '1 / 1',
          }}
        >
          <img
            src={displayImage}
            alt={listing.title}
            className="premium-listing-card__image"
            loading="lazy"
            onError={(e) => {
              if (e.target.src !== PLACEHOLDER) {
                e.target.src = PLACEHOLDER;
              }
            }}
          />

          {/* Badges Overlay */}
          <div className="premium-listing-card__badges">
            <Badge
              variant={listingType === 'short_term' ? 'primary' : 'info'}
              size="sm"
            >
              {listingType === 'short_term' ? 'Short Stay' : 'Long Stay'}
            </Badge>
            {(listing.instantBook || listing.instant_book) && (
              <Badge variant="success" size="sm">
                Instant Book
              </Badge>
            )}
          </div>

          {/* Favorite Heart Overlay — Fast pop animation with glow and sparkles */}
          {showFavorite && (
            <button
              type="button"
              onClick={handleFavoriteToggle}
              aria-label={
                isFavorited
                  ? 'Remove from favorites'
                  : 'Add to favorites'
              }
              className={`premium-listing-card__heart ${
                isFavorited ? 'premium-listing-card__heart--active' : ''
              } ${isAnimating ? 'premium-listing-card__heart--popping' : ''}`}
            >
              {/* Heart SVG */}
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>

              {/* Inner glow ring */}
              <span
                className={`premium-listing-card__heart-ring ${
                  isAnimating
                    ? 'premium-listing-card__heart-ring--bursting'
                    : ''
                }`}
              />

              {/* Outer glow ring */}
              <span
                className={`premium-listing-card__heart-ring premium-listing-card__heart-ring--outer ${
                  isAnimating
                    ? 'premium-listing-card__heart-ring--bursting'
                    : ''
                }`}
              />

              {/* Sparkle particles */}
              <span
                className={`premium-listing-card__heart-sparkle ${
                  isAnimating
                    ? 'premium-listing-card__heart-sparkle--bursting'
                    : ''
                }`}
              />
              <span
                className={`premium-listing-card__heart-sparkle ${
                  isAnimating
                    ? 'premium-listing-card__heart-sparkle--bursting'
                    : ''
                }`}
              />
              <span
                className={`premium-listing-card__heart-sparkle ${
                  isAnimating
                    ? 'premium-listing-card__heart-sparkle--bursting'
                    : ''
                }`}
              />
              <span
                className={`premium-listing-card__heart-sparkle ${
                  isAnimating
                    ? 'premium-listing-card__heart-sparkle--bursting'
                    : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* Content Below Image */}
        <div className="premium-listing-card__content">
          {/* Title Row with Rating */}
          <div className="premium-listing-card__title-row">
            <h3 className="premium-listing-card__title">{listing.title}</h3>
            {rating > 0 && (
              <span className="premium-listing-card__rating">
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="currentColor"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {rating}
              </span>
            )}
          </div>

          {/* Location */}
          <p className="premium-listing-card__location">
            {sublocation ? `${sublocation}, ${location}` : location}
          </p>

          {/* Property Details */}
          <p className="premium-listing-card__details">
            {listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''} ·{' '}
            {listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''}
          </p>

          {/* Price Row with Social Proof Saved Count */}
          <div className="premium-listing-card__footer">
            <p className="premium-listing-card__price">
              <span className="premium-listing-card__price-amount">
                {priceDisplay}
              </span>
              <span className="premium-listing-card__price-period">
                {' '}
                {pricePeriod}
              </span>
            </p>

            {savedCount > 0 && (
              <span
                className="premium-listing-card__saved-count"
                title={`Saved by ${savedCount} ${savedCount === 1 ? 'traveler' : 'travelers'}`}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {savedCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}