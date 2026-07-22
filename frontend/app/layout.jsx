// frontend/app/layout.jsx
// Root layout for the ROOSTAY application
// Includes global metadata, viewport, and font optimizations
// Author: Theron

import '@/styles/main.css';
import constants from '@/lib/constants';

export const metadata = {
  title: {
    default: `${constants.APP_NAME} | ${constants.APP_DESCRIPTION}`,
    template: `%s | ${constants.APP_NAME}`,
  },
  description: constants.APP_DESCRIPTION,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  keywords: ['Ethiopia rentals', 'Addis Ababa short term rental', 'Ethiopian home sharing', 'ROOSTAY', 'long term rental Ethiopia'],
  authors: [{ name: 'Theron (Atnatewos)', url: process.env.NEXT_PUBLIC_APP_URL }],
  creator: 'ROOSTAY',
  publisher: 'ROOSTAY PLC',
  formatDetection: {
    telephone: false, // Prevents iOS from auto-linking phone numbers
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2563EB', // Match your primary brand color
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