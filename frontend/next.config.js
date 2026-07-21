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

  // =========================================================================
  // MONOREPO CONFIGURATION — Transpile local packages from packages/
  // =========================================================================
  transpilePackages: [
    '@roostay/config',
    '@roostay/database',
    '@roostay/middleware',
    '@roostay/services',
    '@roostay/utils',
  ],

  // =========================================================================
  // SERVER-ONLY PACKAGES — Don't bundle these into client JS
  // Webpack will leave them as external `require()` calls for Node.js runtime
  // This is CRITICAL for Vercel + Express monorepo deployments
  // =========================================================================
  serverExternalPackages: [
    'express',
    'helmet',
    'cors',
    'cookie-parser',
    'jsonwebtoken',
    'bcryptjs',
    'pg',
    'joi',
    'multer',
    'morgan',
    'cloudinary',
    'node-cron',
    '@upstash/redis',
  ],

  // Webpack configuration for monorepo compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude all server-only packages from bundling on the server side too
      // This ensures native modules like 'pg' work correctly in serverless
      config.externals = [
        ...config.externals,
        'pg',
        'pg-native',
        'bcryptjs',
      ];
    }

    // Resolve packages/ directory as if it's a node_modules package
    // This allows require('@roostay/config') to resolve from anywhere
    config.resolve.alias = {
      ...config.resolve.alias,
      '@roostay/config': require('path').resolve(__dirname, '../packages/config'),
      '@roostay/database': require('path').resolve(__dirname, '../packages/database'),
      '@roostay/middleware': require('path').resolve(__dirname, '../packages/middleware'),
      '@roostay/services': require('path').resolve(__dirname, '../packages/services'),
      '@roostay/utils': require('path').resolve(__dirname, '../packages/utils'),
    };

    return config;
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@roostay/ui'],
  },

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