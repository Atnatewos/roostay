'use client';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import StarRating from '@/components/ui/StarRating';
import { apiClient } from '@/lib/api';

const PLACEHOLDER = '/images/placeholder-listing.svg';

export default function ListingCard({ listing, showFavorite = true }) {
  const priceDisplay = listing.listingType === 'long_term'
    ? `${listing.pricePerMonth?.toLocaleString()} Br/month`
    : `${listing.pricePerNight?.toLocaleString()} Br/night`;

  async function handleFavoriteToggle(e, listingId) {
    e.preventDefault();
    e.stopPropagation();
    try { await apiClient.post('/favorites/' + listingId); } catch {}
  }

  return (
    <div className="listing-card">
      <Link href={'/listings/' + listing.id} className="listing-card__link">
        <div className="listing-card__image-wrapper">
          <img src={listing.primaryImage || PLACEHOLDER} alt={listing.title} className="listing-card__image" loading="lazy" onError={(e) => { e.target.src = PLACEHOLDER; }} />
          <div className="listing-card__badges">
            <Badge variant={listing.listingType === 'short_term' ? 'primary' : 'info'} size="sm">{listing.listingType === 'short_term' ? 'Short Stay' : 'Long Stay'}</Badge>
            {listing.instantBook && <Badge variant="success" size="sm">Instant Book</Badge>}
          </div>
          {showFavorite && (
            <button className="listing-card__favorite" onClick={(e) => handleFavoriteToggle(e, listing.id)} aria-label="Toggle favorite">
              <svg className="listing-card__favorite-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          )}
        </div>
        <div className="listing-card__content">
          <div className="listing-card__header">
            <h3 className="listing-card__title">{listing.title}</h3>
          </div>
          <p className="listing-card__location">{listing.city || listing.location?.city}</p>
          <div className="listing-card__details">
            <span>{listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''}</span>
            <span className="listing-card__detail-separator">&middot;</span>
            <span>{listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''}</span>
          </div>
          <div className="listing-card__footer">
            <span className="listing-card__price"><strong>{priceDisplay}</strong></span>
          </div>
        </div>
      </Link>
    </div>
  );
}
