'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Skeleton from '@/components/ui/Skeleton';
import useApi from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import constants from '@/lib/constants';

export default function HomePage() {
  const { data: listingsData, isLoading, execute } = useApi();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    execute(() => apiClient.get('/listings?limit=6&sortBy=view_count&sortOrder=DESC'));
  }, [execute]);

  const featuredListings = listingsData?.data || [];

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCity) params.set('city', selectedCity);
    window.location.href = `/search?${params.toString()}`;
  }

  return (
    <>
      <Header />
      <main className="home-page">
        <section className="home-page__hero">
          <div className="container">
            <h1 className="home-page__hero-title">Find Your Perfect Stay in Ethiopia</h1>
            <p className="home-page__hero-subtitle">
              From short-term getaways to long-term rentals — discover apartments, villas, and guest houses across Ethiopia.
            </p>
            <form className="home-page__search" onSubmit={handleSearch}>
              <div className="home-page__search-inputs">
                <input type="text" placeholder="Search by name, city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input input--search" />
                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="input input--select">
                  <option value="">All Cities</option>
                  {constants.CITIES.map((city) => (<option key={city} value={city}>{city}</option>))}
                </select>
              </div>
              <button type="submit" className="btn btn--primary btn--search">Search</button>
            </form>
          </div>
        </section>

        <section className="home-page__featured">
          <div className="container">
            <div className="home-page__section-header">
              <h2 className="home-page__section-title">Popular Stays</h2>
              <Link href="/listings" className="home-page__view-all">View all listings</Link>
            </div>
            <div className="listing-grid">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} type="card" />))
              ) : featuredListings.length > 0 ? (
                featuredListings.map((listing) => (
                  <div key={listing.id} className="listing-card">
                    <Link href={`/listings/${listing.id}`} className="listing-card__link">
                      <div className="listing-card__image-wrapper">
                        <img src={listing.primaryImage || '/images/placeholder-listing.svg'} alt={listing.title} className="listing-card__image" />
                      </div>
                      <div className="listing-card__content">
                        <h3 className="listing-card__title">{listing.title}</h3>
                        <p className="listing-card__location">{listing.city}</p>
                        <div className="listing-card__footer">
                          <span className="listing-card__price"><strong>{constants.CURRENCY_SYMBOL} {listing.pricePerNight?.toLocaleString() || listing.pricePerMonth?.toLocaleString()}/night</strong></span>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="listing-grid__empty">
                  <p className="listing-grid__empty-text">No listings available yet. Be the first to host!</p>
                  <Link href="/host/listings/create" className="btn btn--outline">Create a Listing</Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="home-page__how-it-works">
          <div className="container">
            <h2 className="home-page__section-title">How ROOSTAY Works</h2>
            <div className="steps-grid">
              <div className="step-card"><div className="step-card__number">1</div><h3 className="step-card__title">Search</h3><p className="step-card__description">Browse verified listings across Ethiopian cities.</p></div>
              <div className="step-card"><div className="step-card__number">2</div><h3 className="step-card__title">Book</h3><p className="step-card__description">Choose your dates and book instantly.</p></div>
              <div className="step-card"><div className="step-card__number">3</div><h3 className="step-card__title">Stay</h3><p className="step-card__description">Enjoy your stay and leave a review.</p></div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
