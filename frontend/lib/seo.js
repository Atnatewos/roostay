// frontend/lib/seo.js
// Centralized SEO utility for scalable, consistent metadata generation
// All absolute URLs are built dynamically from the auto-detected domain
// Zero hardcoded URLs — works on any domain without configuration
// Author: Theron

import { getBaseUrl } from './url';
import constants from './constants';

/**
 * Generates standardized metadata for Next.js App Router pages.
 *
 * @param {Object}  options
 * @param {string}  options.title       - Page-specific title (appended to global title)
 * @param {string}  options.description - Page-specific meta description
 * @param {string}  [options.path]      - URL path for canonical and OG URLs (e.g., '/listings/123')
 * @param {string}  [options.imageUrl]  - Absolute URL for Open Graph / Twitter images
 * @param {string}  [options.type]      - Open Graph type ('website' or 'article')
 * @returns {Object} Next.js Metadata object
 */
export function generateMetadata({
  title,
  description,
  path = '',
  imageUrl,
  type = 'website',
}) {
  const siteName = constants.APP_NAME;
  const defaultTitle = `${siteName} | ${constants.APP_DESCRIPTION}`;
  const fullTitle = title ? `${title} | ${siteName}` : defaultTitle;
  const baseUrl = getBaseUrl();
  const canonicalUrl = path ? `${baseUrl}${path}` : baseUrl;
  const ogImageUrl = imageUrl || `${baseUrl}/images/og-default.jpg`;

  return {
    title: fullTitle,
    description: description || constants.APP_DESCRIPTION,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description: description || constants.APP_DESCRIPTION,
      url: canonicalUrl,
      siteName: siteName,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title || siteName,
        },
      ],
      locale: 'en_US',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: description || constants.APP_DESCRIPTION,
      images: [ogImageUrl],
      creator: '@roostay_ethiopia',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Generates JSON-LD structured data for a Property Listing.
 * This helps Google display rich snippets (price, rating, location) in search results.
 * All URLs are built from the auto-detected domain.
 *
 * @param {Object} listing - The listing data object
 * @returns {string} JSON-LD script content
 */
export function generateListingJsonLd(listing) {
  const baseUrl = getBaseUrl();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Accommodation',
    name: listing.title,
    description: listing.description,
    image:
      listing.images?.[0]?.image_url ||
      listing.images?.[0]?.imageUrl ||
      `${baseUrl}/images/placeholder-listing.svg`,
    url: `${baseUrl}/listings/${listing.id}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: listing.city || listing.location?.city,
      addressRegion: listing.subcity || listing.location?.subcity,
      addressCountry: 'ET',
    },
    geo: {
      '@type': 'GeoCoordinates',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: constants.CURRENCY,
      price:
        listing.listingType === 'long_term'
          ? listing.pricePerMonth
          : listing.pricePerNight,
      url: `${baseUrl}/listings/${listing.id}`,
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: listing.reviews?.avgRating
      ? {
          '@type': 'AggregateRating',
          ratingValue: listing.reviews.avgRating,
          reviewCount: listing.reviews.total,
        }
      : undefined,
  };

  // Remove undefined fields to keep JSON-LD clean
  Object.keys(structuredData).forEach((key) => {
    if (structuredData[key] === undefined) delete structuredData[key];
  });

  return JSON.stringify(structuredData);
}