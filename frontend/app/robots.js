// frontend/app/robots.js
// Instructs search engine crawlers on what to index
// Base URL is auto-detected — works on any domain without configuration
// Author: Theron

import { getBaseUrl } from '@/lib/url';

export default function robots() {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/guest/profile/edit',
          '/host/my-listings/create',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}