// frontend/app/admin/layout.jsx
// Admin layout shell — wraps all /admin/* pages with Sidebar + Header
// All admin pages automatically inherit this layout via Next.js App Router
// Zero duplicated layout code across admin pages
// Author: Theron
'use client';

import Sidebar from '@/components/layout/Sidebar';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Admin Layout Component
 * Provides the shared shell for all admin pages.
 * Includes the admin sidebar navigation and content area.
 * Redirects non-admin users to the login page.
 *
 * Next.js automatically wraps all /admin/* pages with this layout
 * because it's placed at frontend/app/admin/layout.jsx.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The page content to render
 */
export default function AdminLayout({ children }) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();

  /**
   * Redirects non-admin users away from the admin panel.
   * Waits for auth to load before checking to prevent flash redirects.
   */
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin/dashboard');
      } else if (!isAdmin) {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  // Show nothing while checking authentication
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  // Don't render admin content for non-admin users
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="admin-layout">
      <Sidebar role="admin" />
      <main className="admin-layout__content">
        {children}
      </main>
    </div>
  );
}