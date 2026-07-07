// frontend/app/layout.jsx
// Root layout for the ROOSTAY application
// Provides the HTML shell, metadata, global styles, and auth context

import '@/styles/main.css';

export const metadata = {
  title: {
    default: 'ROOSTAY — Find Your Space in Ethiopia',
    template: '%s | ROOSTAY',
  },
  description: 'Book short-term and long-term stays across Ethiopia. Apartments, villas, guest houses, and more.',
  keywords: 'Ethiopia, rental, short-term, long-term, apartment, villa, Addis Ababa, booking',
  authors: [{ name: 'ROOSTAY' }],
  openGraph: {
    type: 'website',
    locale: 'en_ET',
    siteName: 'ROOSTAY',
    title: 'ROOSTAY — Find Your Space in Ethiopia',
    description: 'Book short-term and long-term stays across Ethiopia.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}