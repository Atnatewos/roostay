// frontend/app/listings/[id]/page.jsx
// Listing Detail Page — displays full property information, image gallery, amenities, and reviews
// Integrates BookingCard for the reservation flow and Dynamic SEO for search engines
// Author: Theron
'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
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
import { apiClient } from '@/lib/api';
import { generateMetadata, generateListingJsonLd } from '@/lib/seo';

export default function ListingDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Dynamically update document title and meta tags when listing loads
  useEffect(() => {
    if (listing) {
      const price = listing.listingType === 'long_term' ? listing.pricePerMonth : listing.pricePerNight;
      const location = listing.city || listing.location?.city || 'Ethiopia';
      const dynamicTitle = `${listing.title} in ${location} - ${price} ${listing.listingType === 'long_term' ? '/month' : '/night'}`;
      const dynamicDesc = `Book ${listing.title} in ${location}. ${listing.bedrooms} beds, ${listing.bathrooms} baths. ${listing.description.substring(0, 150)}...`;
      
      // Note: In a Server Component, we'd use generateMetadata(). 
      // For Client Components, we update the document directly for SEO crawlers that execute JS, 
      // but for best practice, consider moving data fetching to a Server Component in the future.
      document.title = `${dynamicTitle} | ROOSTAY`;
      
      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = dynamicDesc;
    }
  }, [listing]);

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

  return (
    <>
      {/* JSON-LD Structured Data for Search Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      
      <Header />
      <main className="listing-detail">
        <div className="listing-detail__header">
          <div>
            <h1 className="listing-detail__title">{listing.title}</h1>
            <div className="listing-detail__meta">
              <StarRating rating={reviewSummary?.avgRating || listing.reviews?.avgRating || 0} size="sm" showValue />
              <span>{reviewSummary?.totalReviews || listing.reviews?.total || 0} reviews</span>
              <span>{listing.location?.city}, {listing.location?.subcity}</span>
            </div>
          </div>
        </div>

        <ImageGallery images={listing.images || []} alt={listing.title} />

        <div className="listing-detail__content" style={{ marginTop: '2rem' }}>
          <div className="listing-detail__info">
            <div className="listing-detail__section">
              <div className="listing-detail__host">
                <Avatar name={`${listing.host?.firstName || ''} ${listing.host?.lastName || ''}`} size="lg" src={listing.host?.imageUrl} />
                <div className="listing-detail__host-info">
                  <span className="listing-detail__host-name">Hosted by {listing.host?.firstName} {listing.host?.lastName}</span>
                </div>
              </div>
            </div>

            <div className="listing-detail__section">
              <p className="listing-detail__description">{listing.description}</p>
            </div>

            <div className="listing-detail__section">
              <h3 className="listing-detail__section-title">Amenities</h3>
              <AmenitiesList amenities={listing.amenities || []} />
            </div>

            {/* Reviews Section */}
            <div className="listing-detail__section" style={{ marginTop: '3rem' }}>
              <h3 className="listing-detail__section-title">
                Reviews {reviewSummary?.totalReviews > 0 && `(${reviewSummary.totalReviews})`}
              </h3>
              
              {reviewSummary?.totalReviews > 0 && (
                <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{reviewSummary.avgRating}</p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Overall</p>
                  </div>
                  {Object.entries(reviewSummary.ratings).map(([key, value]) => (
                    <div key={key} style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>{value}</p>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{key}</p>
                    </div>
                  ))}
                </div>
              )}

              {reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {reviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
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