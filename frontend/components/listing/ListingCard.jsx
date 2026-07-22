// frontend/components/listing/ListingCard.jsx
// Property preview card component for listing grids
// Premium vertical layout with inline-critical dimensions to prevent CSS conflicts
// 1:1 aspect ratio image, heart overlay, clean typography
// Author: Theron
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import constants from '@/lib/constants';

const PLACEHOLDER = '/images/placeholder-listing.svg';

/**
 * Premium listing card with inline-critical sizing to guarantee consistency.
 * Card width, image aspect ratio, and spacing are enforced via inline styles
 * to override any legacy CSS conflicts across the platform.
 *
 * @param {Object}    props
 * @param {Object}    props.listing        - Listing data object
 * @param {boolean}   [props.showFavorite] - Whether to show favorite heart
 * @param {Function}  [props.onToggle]     - Optional callback when favorite state changes (listingId, isNowFavorited)
 */
export default function ListingCard({ listing, showFavorite = true, onToggle }) {
  // Default to true if the listing object explicitly says so, otherwise false
  const [isFavorited, setIsFavorited] = useState(listing.isFavorited ?? false);

  // Resolve image with fallback chain
  const rawImageUrl = listing.primaryImage || listing.primary_image || listing.image_url;
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
  const rating = listing.reviews?.avgRating || listing.reviews?.avg_rating || 0;
  const reviewCount = listing.reviews?.total || listing.reviews?.totalReviews || 0;

  // Resolve location
  const location = listing.city || listing.location?.city || '';
  const sublocation = listing.subcity || listing.location?.subcity || '';

  /**
   * Toggles favorite state for this listing.
   * Stops event propagation to prevent link navigation.
   * Notifies parent component via onToggle callback if provided.
   *
   * @param {Event} e - Click event
   */
  async function handleFavoriteToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await apiClient.post(`/favorites/${listing.id}`);
      const newState = !isFavorited;
      setIsFavorited(newState);
      
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
        position: 'relative',
        cursor: 'pointer',
        borderRadius: '12px',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        width: '100%',
        minWidth: '0',
        maxWidth: '100%',
        margin: '0',
        padding: '0',
      }}
    >
      <Link
        href={`/listings/${listing.id}`}
        style={{
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        {/* Image Container — inline 1:1 aspect ratio is CRITICAL */}
        <div
          className="premium-listing-card__image-wrapper"
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#F1F3F5',
          }}
        >
          <img
            src={displayImage}
            alt={listing.title}
            className="premium-listing-card__image"
            loading="lazy"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              inset: '0',
              transition: 'transform 0.3s ease',
            }}
            onError={(e) => {
              if (e.target.src !== PLACEHOLDER) {
                e.target.src = PLACEHOLDER;
              }
            }}
          />

          {/* Badges Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              display: 'flex',
              gap: '6px',
              zIndex: '2',
            }}
          >
            <Badge variant={listingType === 'short_term' ? 'primary' : 'info'} size="sm">
              {listingType === 'short_term' ? 'Short Stay' : 'Long Stay'}
            </Badge>
            {(listing.instantBook || listing.instant_book) && (
              <Badge variant="success" size="sm">
                Instant Book
              </Badge>
            )}
          </div>

          {/* Favorite Heart Overlay */}
          {showFavorite && (
            <button
              type="button"
              onClick={handleFavoriteToggle}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: '3',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                style={{
                  fill: isFavorited ? '#E41D56' : 'rgba(0, 0, 0, 0.25)',
                  stroke: isFavorited ? '#E41D56' : '#FFFFFF',
                  strokeWidth: '2px',
                  filter: isFavorited ? 'none' : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4))',
                  transition: 'fill 0.15s ease',
                }}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            </button>
          )}
        </div>

        {/* Content Below Image */}
        <div
          style={{
            padding: '12px 0 0 0',
          }}
        >
          {/* Title Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '2px',
            }}
          >
            <h3
              style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#1A1A2E',
                lineHeight: '1.3',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: '1',
                margin: '0',
              }}
            >
              {listing.title}
            </h3>
            {rating > 0 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '14px',
                  fontWeight: '400',
                  color: '#1A1A2E',
                  flexShrink: '0',
                }}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="#1A1A2E">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {rating}
              </span>
            )}
          </div>

          {/* Location */}
          <p
            style={{
              fontSize: '15px',
              fontWeight: '400',
              color: '#9CA3AF',
              margin: '0 0 2px 0',
            }}
          >
            {sublocation ? `${sublocation}, ${location}` : location}
          </p>

          {/* Property Details */}
          <p
            style={{
              fontSize: '15px',
              fontWeight: '400',
              color: '#9CA3AF',
              margin: '0 0 2px 0',
            }}
          >
            {listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''} ·{' '}
            {listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''}
          </p>

          {/* Price */}
          <p
            style={{
              fontSize: '15px',
              color: '#1A1A2E',
              margin: '6px 0 0 0',
            }}
          >
            <span style={{ fontWeight: '600' }}>{priceDisplay}</span>
            <span style={{ fontWeight: '400' }}> {pricePeriod}</span>
          </p>
        </div>
      </Link>
    </div>
  );
}