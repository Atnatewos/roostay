// frontend/next.config.js
// Next.js configuration for ROOSTAY frontend
// Configures API proxy, image domains, and build settings

const path = require('path');

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
  // MONOREPO — Transpile local packages
  // =========================================================================
  transpilePackages: [
    '@roostay/config',
    '@roostay/database',
    '@roostay/middleware',
    '@roostay/services',
    '@roostay/utils',
  ],

  // =========================================================================
  // WEBPACK — Externalize all server-only Node.js packages
  // This prevents Webpack from trying to bundle express, pg, etc.
  // into the client-side build. These stay as Node.js require() calls.
  // =========================================================================
  webpack: (config, { isServer }) => {
    // Path to the root node_modules where express, pg, etc. are installed
    const rootNodeModules = path.resolve(__dirname, '../node_modules');

    // Resolve packages/ directory aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@roostay/config': path.resolve(__dirname, '../packages/config'),
      '@roostay/database': path.resolve(__dirname, '../packages/database'),
      '@roostay/middleware': path.resolve(__dirname, '../packages/middleware'),
      '@roostay/services': path.resolve(__dirname, '../packages/services'),
      '@roostay/utils': path.resolve(__dirname, '../packages/utils'),
    };

    // Tell Webpack to look in root node_modules for server deps
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      rootNodeModules,
      path.resolve(__dirname, 'node_modules'),
    ];

    if (isServer) {
      // Externalize ALL server-only packages so they're not bundled
      // This is the equivalent of serverExternalPackages for Next.js 14.2
      const serverPackages = [
        'express',
        'helmet',
        'cors',
        'cookie-parser',
        'jsonwebtoken',
        'bcryptjs',
        'pg',
        'pg-native',
        'joi',
        'multer',
        'morgan',
        'cloudinary',
        'node-cron',
        '@upstash/redis',
        'dotenv',
      ];

      // Add each package to webpack externals
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        ...serverPackages,
        // Also match sub-paths like 'express/lib/...'
        ({ request }, callback) => {
          for (const pkg of serverPackages) {
            if (request === pkg || request.startsWith(pkg + '/')) {
              return callback(null, 'commonjs ' + request);
            }
          }
          callback();
        },
      ];
    }

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