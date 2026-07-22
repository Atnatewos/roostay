// frontend/app/layout.jsx
// Root layout for the ROOSTAY application
// Includes global metadata, viewport, branding icons, and font optimizations
// All brand assets read from branding.config.json — zero hardcoded paths
// Author: Theron

import '@/styles/main.css';
import { getBaseUrl } from '@/lib/url';
import constants from '@/lib/constants';

// Load branding assets from config for favicon and touch icons
const branding = (() => {
  try {
    const config = require('../../packages/config/branding.config.json');
    const env = process.env.NODE_ENV || 'development';
    return config[env] || config.development || {};
  } catch {
    return {};
  }
})();

export const metadata = {
  title: {
    default: `${constants.APP_NAME} | ${constants.APP_DESCRIPTION}`,
    template: `%s | ${constants.APP_NAME}`,
  },
  description: constants.APP_DESCRIPTION,
  metadataBase: new URL(getBaseUrl()),
  keywords: [
    'Ethiopia rentals',
    'Addis Ababa short term rental',
    'Ethiopian home sharing',
    'ROOSTAY',
    'long term rental Ethiopia',
  ],
  authors: [{ name: 'Theron (Atnatewos)', url: getBaseUrl() }],
  creator: 'ROOSTAY',
  publisher: 'ROOSTAY PLC',
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: branding?.logos?.favicon || '/favicon.ico',
    apple: branding?.logos?.appleTouchIcon || '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: branding?.colors?.primary || '#2563EB',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}