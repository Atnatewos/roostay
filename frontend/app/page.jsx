// frontend/app/page.jsx
// Homepage — Hero section, featured listings, and value proposition
// All content strings are driven by content.config.json via useConfig()
// Feature flags control visibility of sections
// Author: Theron
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Skeleton from '@/components/ui/Skeleton';
import useApi from '@/hooks/useApi';
import useConfig from '@/hooks/useConfig';
import { apiClient } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * HomePage Component
 * Serves as the main landing page for ROOSTAY.
 * All text content is fetched from the centralized config system.
 * Feature flags control which sections are rendered.
 */
export default function HomePage() {
  const { data: listingsData, isLoading, execute } = useApi();
  const { content, payment, isEnabled } = useConfig();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Load homepage content strings from config
  const homepageContent = content?.homepage || {};

  // Load currency info from payment config
  const currencySymbol = payment?.currencySymbol || constants.CURRENCY_SYMBOL;

  // Fetch popular listings on component mount
  useEffect(() => {
    execute(() =>
      apiClient.get('/listings?limit=6&sortBy=view_count&sortOrder=DESC')
    );
  }, [execute]);

  const featuredListings = listingsData?.data || [];

  /**
   * Handles the search form submission.
   * Constructs a query string and redirects to the search page.
   *
   * @param {React.FormEvent} e - The form submission event
   */
  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }
    if (selectedCity) {
      params.set('city', selectedCity);
    }

    window.location.href = `${constants.ROUTES.SEARCH}?${params.toString()}`;
  }

  return (
    <>
      <Header />
      <main className="home-page">
        {/* Hero Section with Search Interface */}
        <section className="home-page__hero">
          <div className="container">
            <h1 className="home-page__hero-title">
              {homepageContent.heroTitle || 'Find Your Perfect Stay in Ethiopia'}
            </h1>
            <p className="home-page__hero-subtitle">
              {homepageContent.heroSubtitle ||
                'From short-term getaways to long-term rentals — discover apartments, villas, and guest houses across Ethiopia.'}
            </p>

            <form className="home-page__search" onSubmit={handleSearch}>
              <div className="home-page__search-inputs">
                <input
                  type="text"
                  placeholder={homepageContent.searchPlaceholder || 'Search by name, city...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input input--search"
                  aria-label="Search listings"
                />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="input input--select"
                  aria-label="Select city"
                >
                  <option value="">
                    {homepageContent.allCities || 'All Cities'}
                  </option>
                  {constants.CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn--primary btn--search">
                {homepageContent.searchButton || 'Search'}
              </button>
            </form>
          </div>
        </section>

        {/* Featured Listings Section */}
        <section className="home-page__featured">
          <div className="container">
            <div className="home-page__section-header">
              <h2 className="home-page__section-title">
                {homepageContent.popularStays || 'Popular Stays'}
              </h2>
              <Link href={constants.ROUTES.LISTINGS} className="home-page__view-all">
                {homepageContent.viewAllListings || 'View all listings'}
              </Link>
            </div>

            <div className="listing-grid">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} type="card" />
                ))
              ) : featuredListings.length > 0 ? (
                featuredListings.map((listing) => {
                  const priceDisplay =
                    listing.listingType === 'long_term'
                      ? `${currencySymbol} ${listing.pricePerMonth?.toLocaleString()}/month`
                      : `${currencySymbol} ${listing.pricePerNight?.toLocaleString()}/night`;

                  return (
                    <div key={listing.id} className="listing-card">
                      <Link
                        href={`${constants.ROUTES.LISTINGS}/${listing.id}`}
                        className="listing-card__link"
                      >
                        <div className="listing-card__image-wrapper">
                          <img
                            src={
                              listing.primaryImage ||
                              '/images/placeholder-listing.svg'
                            }
                            alt={listing.title}
                            className="listing-card__image"
                            loading="lazy"
                          />
                        </div>
                        <div className="listing-card__content">
                          <h3 className="listing-card__title">{listing.title}</h3>
                          <p className="listing-card__location">{listing.city}</p>
                          <div className="listing-card__footer">
                            <span className="listing-card__price">
                              <strong>{priceDisplay}</strong>
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="listing-grid__empty">
                  <p className="listing-grid__empty-text">
                    {homepageContent.noListings ||
                      'No listings available yet. Be the first to host!'}
                  </p>
                  <Link
                    href={constants.ROUTES.HOST_LISTINGS_CREATE}
                    className="btn btn--outline"
                  >
                    {homepageContent.createListing || 'Create a Listing'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* How It Works Section — controlled by feature flag */}
        {isEnabled('homepage.howItWorks') !== false && (
          <section className="home-page__how-it-works">
            <div className="container">
              <h2 className="home-page__section-title">
                {homepageContent.howItWorks || 'How ROOSTAY Works'}
              </h2>
              <div className="steps-grid">
                {(homepageContent.steps || [
                  { number: 1, title: 'Search', description: 'Browse verified listings across Ethiopian cities.' },
                  { number: 2, title: 'Book', description: 'Choose your dates and book instantly with secure payments.' },
                  { number: 3, title: 'Stay', description: 'Enjoy your stay and leave a review for the community.' },
                ]).map((step) => (
                  <div key={step.number} className="step-card">
                    <div className="step-card__number">{step.number}</div>
                    <h3 className="step-card__title">{step.title}</h3>
                    <p className="step-card__description">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}