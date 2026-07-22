// frontend/app/sitemap.js
// Generates an XML sitemap for search engines to discover all public pages
// Author: Theron

import constants from '@/lib/constants';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const currentDate = new Date().toISOString();

  // 1. Static Routes
  const staticRoutes = [
    { url: baseUrl, lastModified: currentDate, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/listings`, lastModified: currentDate, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/search`, lastModified: currentDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/register`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // 2. Dynamic Routes (Listings)
  // In a production environment, fetch the top/most recent listing IDs from your API
  // For now, we provide the structure. You can expand this to fetch from `/api/listings?limit=100`
  let dynamicListingRoutes = [];
  try {
    // Example of how to fetch dynamically (uncomment and adapt when API allows public listing fetch without auth)
    // const res = await fetch(`${baseUrl}/api/listings?limit=50`);
    // const data = await res.json();
    // dynamicListingRoutes = data.data.map(listing => ({
    //   url: `${baseUrl}/listings/${listing.id}`,
    //   lastModified: listing.createdAt || currentDate,
    //   changeFrequency: 'weekly',
    //   priority: 0.8,
    // }));
  } catch (error) {
    console.warn('Failed to fetch dynamic listings for sitemap:', error);
  }

  return [...staticRoutes, ...dynamicListingRoutes];
}