// frontend/next.config.js
// Next.js configuration for ROOSTAY frontend
// Configures API proxy, image domains, and build settings

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow images from Cloudinary and other configured domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
        pathname: '/**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    NEXT_PUBLIC_APP_NAME: process.env.APP_NAME || 'ROOSTAY',
    NEXT_PUBLIC_APP_URL: process.env.APP_URL || 'http://localhost:3000',
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@roostay/ui'],
  },

  // Handle packages from the monorepo
  transpilePackages: [],

  // Redirects for common routes
  async redirects() {
    return [
      {
        source: '/host',
        destination: '/host/dashboard',
        permanent: true,
      },
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
      {
        source: '/guest',
        destination: '/guest/dashboard',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;