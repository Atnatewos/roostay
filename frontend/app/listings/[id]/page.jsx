// frontend/app/listings/[id]/page.jsx
// Listing Detail Page — displays full property information, image gallery, amenities, and reviews
// Integrates BookingCard for the reservation flow and Dynamic SEO for search engines
// Features rating distribution bar chart, review sorting, helpfulness voting, and review summary
// Author: Theron
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ImageGallery from '@/components/listing/ImageGallery';
import AmenitiesList from '@/components/listing/AmenitiesList';
import BookingCard from '@/components/booking/BookingCard';
import ReviewCard from '@/components/review/ReviewCard';
import EmptyState from '@/components/ui/EmptyState';
import StarRating from '@/components/ui/StarRating';
import Avatar from '@/components/ui/Avatar';
import Skeleton from '@/components/ui/Skeleton';
import useConfig from '@/hooks/useConfig';
import { apiClient } from '@/lib/api';
import { generateListingJsonLd } from '@/lib/seo';

/**
 * Maximum number of reviews to display before showing "Show more" button.
 */
const REVIEWS_PER_PAGE = 6;

export default function ListingDetailPage() {
  const params = useParams();
  const { content } = useConfig();

  // Listing and review data state
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Review display state
  const [visibleReviewCount, setVisibleReviewCount] = useState(REVIEWS_PER_PAGE);
  const [reviewSort, setReviewSort] = useState('recent');

  // Content strings from config with English fallbacks
  const detailContent = content?.admin?.listingDetail || content?.listingDetail || {};

  /**
   * Fetches listing data and reviews from the API in parallel.
   */
  useEffect(() => {
    async function fetchData() {
      try {
        const [listingRes, reviewsRes] = await Promise.all([
          apiClient.get(`/listings/${params.id}`),
          apiClient.get(`/listings/${params.id}/reviews`),
        ]);

        if (listingRes?.data?.listing) {
          setListing(listingRes.data.listing);
        }

        if (reviewsRes?.data) {
          setReviewSummary(reviewsRes.data.summary);
          setReviews(reviewsRes.data.reviews || []);
        }
      } catch (err) {
        console.error('Failed to fetch listing data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) fetchData();
  }, [params.id]);

  /**
   * Updates document title and meta description for SEO.
   */
  useEffect(() => {
    if (listing) {
      const price =
        listing.listingType === 'long_term'
          ? listing.pricePerMonth
          : listing.pricePerNight;
      const location = listing.city || listing.location?.city || 'Ethiopia';
      const priceLabel = listing.listingType === 'long_term' ? '/month' : '/night';

      const dynamicTitle = `${listing.title} in ${location} - ${price} ${priceLabel}`;
      const dynamicDesc = `Book ${listing.title} in ${location}. ${listing.bedrooms} beds, ${listing.bathrooms} baths. ${listing.description?.substring(0, 150)}...`;

      document.title = `${dynamicTitle} | ROOSTAY`;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = dynamicDesc;
    }
  }, [listing]);

  /**
   * Sorts reviews by the selected criteria.
   */
  function getSortedReviews(reviewList, sort) {
    const sorted = [...reviewList];

    switch (sort) {
      case 'highest':
        return sorted.sort((a, b) => (b.rating_overall || 0) - (a.rating_overall || 0));
      case 'lowest':
        return sorted.sort((a, b) => (a.rating_overall || 0) - (b.rating_overall || 0));
      case 'recent':
      default:
        return sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }

  function handleShowMoreReviews() {
    setVisibleReviewCount((prev) => prev + REVIEWS_PER_PAGE);
  }

  const sortedReviews = getSortedReviews(reviews, reviewSort);
  const visibleReviews = sortedReviews.slice(0, visibleReviewCount);
  const hasMoreReviews = visibleReviewCount < sortedReviews.length;

  // Loading state
  if (isLoading || !listing) {
    return (
      <>
        <Header />
        <div className="container" style={{ padding: '3rem 1rem' }}>
          <Skeleton type="rect" height="400px" />
          <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '3rem' }}>
            <div>
              <Skeleton type="text" count={3} />
              <Skeleton type="text" width="40%" />
            </div>
            <Skeleton type="rect" height="300px" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const jsonLd = generateListingJsonLd(listing);

  // Rating data from API
  const avgRating = reviewSummary?.avgRating || listing.reviews?.avgRating || 0;
  const totalReviews = reviewSummary?.totalReviews || listing.reviews?.total || 0;
  const categoryRatings = reviewSummary?.ratings || {};
  const ratingDistribution = reviewSummary?.distribution || {};

  /**
   * Builds the rating distribution data for the visual bar chart.
   * Each entry has a label, count, and calculated percentage of total.
   */
  const distributionData = [
    { label: '5 ★', count: ratingDistribution.fiveStar || 0 },
    { label: '4 ★', count: ratingDistribution.fourStar || 0 },
    { label: '3 ★', count: ratingDistribution.threeStar || 0 },
    { label: '2 ★', count: ratingDistribution.twoStar || 0 },
    { label: '1 ★', count: ratingDistribution.oneStar || 0 },
  ];

  const maxDistributionCount = Math.max(...distributionData.map((d) => d.count), 1);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Header />
      <main className="listing-detail">
        {/* Title and Meta */}
        <div className="listing-detail__header">
          <div>
            <h1 className="listing-detail__title">{listing.title}</h1>
            <div className="listing-detail__meta">
              <StarRating rating={avgRating} size="sm" showValue />
              <span>
                {totalReviews > 0
                  ? `${totalReviews} review${totalReviews !== 1 ? 's' : ''}`
                  : 'No reviews yet'}
              </span>
              <span>
                {listing.location?.city}
                {listing.location?.subcity ? `, ${listing.location.subcity}` : ''}
              </span>
            </div>
          </div>
        </div>

        <ImageGallery images={listing.images || []} alt={listing.title} />

        <div className="listing-detail__content" style={{ marginTop: '2rem' }}>
          <div className="listing-detail__info">
            {/* Host Section */}
            <div className="listing-detail__section">
              <div className="listing-detail__host">
                <Avatar
                  name={`${listing.host?.firstName || ''} ${listing.host?.lastName || ''}`}
                  size="lg"
                  src={listing.host?.imageUrl}
                />
                <div className="listing-detail__host-info">
                  <span className="listing-detail__host-name">
                    Hosted by {listing.host?.firstName} {listing.host?.lastName}
                  </span>
                </div>
              </div>
            </div>

            <div className="listing-detail__section">
              <p className="listing-detail__description">{listing.description}</p>
            </div>

            <div className="listing-detail__section">
              <h3 className="listing-detail__section-title">
                {detailContent.amenities || 'Amenities'}
              </h3>
              <AmenitiesList amenities={listing.amenities || []} />
            </div>

            {/* Reviews Section */}
            <div className="listing-detail__section" style={{ marginTop: '3rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '2rem',
                }}
              >
                <h3 className="listing-detail__section-title" style={{ marginBottom: 0 }}>
                  {detailContent.reviews || 'Reviews'}
                  {totalReviews > 0 && ` (${totalReviews})`}
                </h3>

                {totalReviews > 0 && (
                  <select
                    className="input input--select input--sm"
                    value={reviewSort}
                    onChange={(e) => {
                      setReviewSort(e.target.value);
                      setVisibleReviewCount(REVIEWS_PER_PAGE);
                    }}
                    style={{ width: '180px' }}
                    aria-label="Sort reviews"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="highest">Highest Rated</option>
                    <option value="lowest">Lowest Rated</option>
                  </select>
                )}
              </div>

              {/* Rating Breakdown */}
              {totalReviews > 0 && (
                <div style={{ marginBottom: '2.5rem' }}>
                  {/* Overall + Category Averages */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '1rem',
                      marginBottom: '2rem',
                    }}
                  >
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '1.25rem 1rem',
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    >
                      <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', lineHeight: '1', marginBottom: '0.25rem' }}>
                        {avgRating}
                      </p>
                      <StarRating rating={avgRating} size="sm" />
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                        Overall
                      </p>
                    </div>

                    {Object.entries(categoryRatings).map(([key, value]) => (
                      <div
                        key={key}
                        style={{
                          textAlign: 'center',
                          padding: '1rem',
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--color-border-light)',
                        }}
                      >
                        <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)', lineHeight: '1', marginBottom: '0.25rem' }}>
                          {value}
                        </p>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                          {key}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Rating Distribution Bar Chart */}
                  <div
                    style={{
                      padding: '1.5rem',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--color-border-light)',
                    }}
                  >
                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.25rem', color: 'var(--color-text)' }}>
                      Rating Distribution
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {distributionData.map((item) => {
                        const percent = totalReviews > 0 ? (item.count / totalReviews) * 100 : 0;

                        return (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ width: '36px', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', textAlign: 'right', flexShrink: 0 }}>
                              {item.label}
                            </span>
                            <div
                              style={{
                                flex: 1,
                                height: '8px',
                                backgroundColor: 'var(--color-bg-tertiary)',
                                borderRadius: '4px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${Math.max(percent, item.count > 0 ? 3 : 0)}%`,
                                  backgroundColor: item.count === maxDistributionCount ? 'var(--color-text)' : 'var(--color-text-light)',
                                  borderRadius: '4px',
                                  transition: 'width 800ms cubic-bezier(0.19, 1, 0.22, 1)',
                                }}
                              />
                            </div>
                            <span style={{ width: '32px', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-light)', textAlign: 'left', flexShrink: 0 }}>
                              {item.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Review List */}
              {visibleReviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {visibleReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}

                  {hasMoreReviews && (
                    <div style={{ textAlign: 'center', paddingTop: '1.5rem' }}>
                      <button
                        className="btn btn--outline btn--sm"
                        onClick={handleShowMoreReviews}
                        type="button"
                      >
                        Show More Reviews ({sortedReviews.length - visibleReviewCount} remaining)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon="star"
                  title="No reviews yet"
                  description="Be the first to review this property after your stay!"
                />
              )}
            </div>
          </div>

          <div className="listing-detail__sidebar">
            <BookingCard listing={listing} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}