// frontend/app/layout.jsx
// Root layout component — wraps the entire application
// Includes global providers for toast notifications
// Imports global styles and sets up HTML structure
// Author: Theron

import '@/styles/main.css';
import ToastProvider from '@/components/providers/ToastProvider';

export const metadata = {
  title: 'ROOSTAY - Find Your Perfect Stay in Ethiopia',
  description: 'Book short-term and long-term rentals across Ethiopia. Find apartments, houses, villas, and more.',
};

/**
 * Root Layout Component
 * Wraps the entire application with global providers and styles.
 * All pages inherit this layout automatically.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}