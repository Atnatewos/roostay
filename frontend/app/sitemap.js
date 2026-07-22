// frontend/app/sitemap.js
// Generates an XML sitemap for search engines to discover all public pages
// All URLs are built dynamically from the auto-detected base URL
// Author: Theron

import { getBaseUrl } from '@/lib/url';

export default async function sitemap() {
  const baseUrl = getBaseUrl();
  const currentDate = new Date().toISOString();

  // Static routes — always present regardless of environment
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/listings`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Dynamic listing routes — fetch from API and map to sitemap entries
  let dynamicListingRoutes = [];
  try {
    // Uncomment and adapt when the public listing endpoint is available without auth
    // const res = await fetch(`${baseUrl}/api/listings?limit=50`);
    // const data = await res.json();
    // dynamicListingRoutes = data.data.map((listing) => ({
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