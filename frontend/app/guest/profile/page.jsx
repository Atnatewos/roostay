// frontend/app/guest/profile/page.jsx
// Guest Profile Page — displays user information and application status
// Redirects to the host application form for guests who want to become hosts
// Shows pending application status if user has submitted an application
// Author: Theron
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import useAuth from '@/hooks/useAuth';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Guest Profile Page
 * Displays the authenticated user's profile information.
 * For guests: Shows a "Become a Host" section that links to the application form.
 * If user has a pending application, shows the status instead.
 */
export default function GuestProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/guest/profile')}`);
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch application status for guests
  useEffect(() => {
    async function fetchApplicationStatus() {
      if (!user || user.role !== 'guest') {
        setIsLoadingStatus(false);
        return;
      }

      try {
        const response = await apiClient.get('/users/host-application-status');
        if (response?.data?.application) {
          setApplicationStatus(response.data.application);
        }
      } catch (err) {
        // No application found — this is normal for new guests
        console.debug('No host application found');
      } finally {
        setIsLoadingStatus(false);
      }
    }

    if (user) {
      fetchApplicationStatus();
    }
  }, [user]);

  if (authLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '800px' }}>
          <Skeleton type="rect" height="40px" width="200px" />
          <div style={{ marginTop: '2rem' }}>
            <Skeleton type="rect" height="200px" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '800px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
            My Profile
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Profile Information Card */}
        <Card padding="lg" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1.5rem' }}>
            Account Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Full Name
              </p>
              <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)' }}>
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Email Address
              </p>
              <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)' }}>
                {user?.email}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Phone Number
              </p>
              <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)' }}>
                {user?.phoneNumber || 'Not provided'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Account Type
              </p>
              <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)', textTransform: 'capitalize' }}>
                {user?.role}
              </p>
            </div>
          </div>
        </Card>

        {/* Host Application Section — Only for Guests */}
        {user?.role === 'guest' && (
          <Card padding="lg" style={{ 
            border: '2px solid var(--color-primary)', 
            backgroundColor: 'var(--color-primary-light)' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.5rem', color: 'var(--color-primary-dark)' }}>
                  Become a Host
                </h2>
                
                {/* Show different content based on application status */}
                {isLoadingStatus ? (
                  <Skeleton type="text" count={2} />
                ) : applicationStatus ? (
                  <>
                    {/* Application submitted — show status */}
                    <div style={{ marginBottom: '1rem' }}>
                      <Badge 
                        variant={
                          applicationStatus.status === 'pending' ? 'warning' 
                          : applicationStatus.status === 'approved' ? 'success' 
                          : 'danger'
                        } 
                        size="md"
                      >
                        {applicationStatus.status.charAt(0).toUpperCase() + applicationStatus.status.slice(1)}
                      </Badge>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                      {applicationStatus.status === 'pending' && 'Your application is being reviewed. We will notify you within 24-48 hours.'}
                      {applicationStatus.status === 'approved' && 'Congratulations! Your application has been approved. You can now create listings.'}
                      {applicationStatus.status === 'rejected' && `Your application was not approved. ${applicationStatus.review_notes || 'Please contact support for more information.'}`}
                    </p>
                    {applicationStatus.review_notes && applicationStatus.status !== 'rejected' && (
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        Admin notes: {applicationStatus.review_notes}
                      </p>
                    )}
                  </>
                ) : (
                  /* No application — show call to action */
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                    Earn money by sharing your space with travelers. Apply to become a host and start listing your properties today.
                  </p>
                )}
              </div>
              
              <div style={{ flexShrink: 0 }}>
                {isLoadingStatus ? (
                  <Skeleton type="rect" width="150px" height="40px" />
                ) : applicationStatus?.status === 'pending' ? (
                  <Button variant="outline" disabled>
                    Application Pending
                  </Button>
                ) : applicationStatus?.status === 'approved' ? (
                  <Link href={constants.ROUTES.HOST_DASHBOARD}>
                    <Button variant="primary" size="lg">
                      Go to Host Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/guest/become-host">
                    <Button variant="primary" size="lg">
                      Apply to Become a Host
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Quick Links */}
        <Card padding="lg" style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '1rem' }}>
            Quick Links
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href={constants.ROUTES.GUEST_BOOKINGS} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}>
              → View My Bookings
            </Link>
            <Link href={constants.ROUTES.GUEST_FAVORITES} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}>
              → View My Favorites
            </Link>
          </div>
        </Card>
      </main>
      <Footer />
    </>
  );
}