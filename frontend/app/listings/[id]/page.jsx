'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ImageGallery from '@/components/listing/ImageGallery';
import AmenitiesList from '@/components/listing/AmenitiesList';
import BookingCard from '@/components/booking/BookingCard';
import ReviewCard from '@/components/review/ReviewCard';
import StarRating from '@/components/ui/StarRating';
import Avatar from '@/components/ui/Avatar';
import Skeleton from '@/components/ui/Skeleton';
import useApi from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import constants from '@/lib/constants';

export default function ListingDetailPage() {
  const params = useParams();
  const { data, isLoading, execute } = useApi();
  const [listing, setListing] = useState(null);

  useEffect(() => {
    execute(() => apiClient.get(`/listings/${params.id}`));
  }, [params.id, execute]);

  useEffect(() => {
    if (data?.data?.listing) setListing(data.data.listing);
  }, [data]);

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

  return (
    <>
      <Header />
      <main className="listing-detail">
        <div className="listing-detail__header">
          <div>
            <h1 className="listing-detail__title">{listing.title}</h1>
            <div className="listing-detail__meta">
              <StarRating rating={listing.reviews?.avgRating || 0} size="sm" showValue />
              <span>{listing.reviews?.total || 0} reviews</span>
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
