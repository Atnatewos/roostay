// frontend/components/layout/Header.jsx
// Main navigation header with responsive hamburger menu
// Includes "Become a Host" link for guests, user dropdown, and role-adaptive links
// Author: Theron
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import NotificationBell from '@/components/notifications/NotificationBell';
import constants from '@/lib/constants';

/**
 * Header Component
 * Main navigation bar with responsive design.
 * Features a prominent "Become a Host" link for guest users.
 */
export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const headerRef = useRef(null);

  function closeAllDropdowns() {
    setIsUserMenuOpen(false);
    setIsNotificationOpen(false);
  }

  function handleUserMenuToggle() {
    setIsNotificationOpen(false);
    setIsUserMenuOpen((prev) => !prev);
  }

  function handleNotificationToggle(isOpen) {
    setIsUserMenuOpen(false);
    setIsNotificationOpen(isOpen);
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        closeAllDropdowns();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    router.push(constants.ROUTES.HOME);
  }

  return (
    <header className="header" ref={headerRef}>
      <div className="header__container">
        {/* Logo */}
        <Link href={constants.ROUTES.HOME} className="header__logo">
          ROOSTAY
        </Link>

        {/* Desktop Navigation */}
        <nav className="header__nav" aria-label="Main navigation">
          <Link href={constants.ROUTES.LISTINGS} className="header__link">Browse</Link>
          <Link href={constants.ROUTES.SEARCH} className="header__link">Search</Link>

          {/* Become a Host Link - Only visible to Guests */}
          {isAuthenticated && user?.role === 'guest' && (
            <Link 
              href={constants.ROUTES.GUEST_PROFILE} 
              className="header__link header__link--highlight"
              style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-semibold)' }}
            >
              Become a Host
            </Link>
          )}

          {/* Role-specific dashboard link */}
          {isAuthenticated && user && (
            <>
              {user.role === 'guest' && (
                <Link href={constants.ROUTES.GUEST_DASHBOARD} className="header__link">Dashboard</Link>
              )}
              {user.role === 'host' && (
                <Link href={constants.ROUTES.HOST_DASHBOARD} className="header__link">Dashboard</Link>
              )}
              {user.role === 'admin' && (
                <Link href={constants.ROUTES.ADMIN_DASHBOARD} className="header__link">Admin</Link>
              )}
            </>
          )}
        </nav>

        {/* Right Side: Notifications + User Menu */}
        <div className="header__actions">
          <NotificationBell 
            isAuthenticated={isAuthenticated}
            isOpen={isNotificationOpen}
            onToggle={handleNotificationToggle}
          />

          {isAuthenticated && user ? (
            <div className="header__user-menu">
              <button
                type="button"
                onClick={handleUserMenuToggle}
                className="header__user-button"
                aria-expanded={isUserMenuOpen}
                aria-label="User menu"
              >
                <div className="header__avatar">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt={user.firstName} />
                  ) : (
                    <span>{user.firstName?.[0] || 'U'}</span>
                  )}
                </div>
                <span className="header__user-name">{user.firstName}</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isUserMenuOpen && (
                <div className="header__dropdown">
                  <div className="header__dropdown-header">
                    <p className="header__dropdown-name">{user.firstName} {user.lastName}</p>
                    <p className="header__dropdown-email">{user.email}</p>
                  </div>

                  <div className="header__dropdown-menu">
                    {/* Show Become a Host in dropdown too if they are a guest */}
                    {user.role === 'guest' && (
                      <Link
                        href={constants.ROUTES.GUEST_PROFILE}
                        className="header__dropdown-link"
                        onClick={closeAllDropdowns}
                        style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-semibold)' }}
                      >
                        Become a Host
                      </Link>
                    )}
                    {user.role === 'guest' && (
                      <Link href={constants.ROUTES.GUEST_BOOKINGS} className="header__dropdown-link" onClick={closeAllDropdowns}>My Bookings</Link>
                    )}
                    {user.role === 'guest' && (
                      <Link href={constants.ROUTES.GUEST_FAVORITES} className="header__dropdown-link" onClick={closeAllDropdowns}>Favorites</Link>
                    )}
                    {user.role === 'host' && (
                      <Link href={constants.ROUTES.HOST_LISTINGS} className="header__dropdown-link" onClick={closeAllDropdowns}>My Listings</Link>
                    )}
                    {user.role === 'host' && (
                      <Link href={constants.ROUTES.HOST_BOOKINGS} className="header__dropdown-link" onClick={closeAllDropdowns}>Bookings</Link>
                    )}
                    {user.role === 'admin' && (
                      <Link href={constants.ROUTES.ADMIN_DASHBOARD} className="header__dropdown-link" onClick={closeAllDropdowns}>Admin Dashboard</Link>
                    )}
                    <Link href={constants.ROUTES.GUEST_PROFILE} className="header__dropdown-link" onClick={closeAllDropdowns}>Profile Settings</Link>
                  </div>

                  <div className="header__dropdown-footer">
                    <button type="button" onClick={() => { closeAllDropdowns(); handleLogout(); }} className="header__dropdown-link header__dropdown-link--logout">
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="header__auth-links">
              <Link href={constants.ROUTES.LOGIN} className="header__link">Login</Link>
              <Link href={constants.ROUTES.REGISTER} className="header__button">Sign Up</Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => { closeAllDropdowns(); setIsMenuOpen(!isMenuOpen); }}
            className="header__menu-toggle"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav className="header__mobile-nav" aria-label="Mobile navigation">
          <Link href={constants.ROUTES.LISTINGS} className="header__mobile-link" onClick={() => setIsMenuOpen(false)}>Browse</Link>
          <Link href={constants.ROUTES.SEARCH} className="header__mobile-link" onClick={() => setIsMenuOpen(false)}>Search</Link>
          
          {isAuthenticated && user?.role === 'guest' && (
            <Link href={constants.ROUTES.GUEST_PROFILE} className="header__mobile-link" onClick={() => setIsMenuOpen(false)} style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-semibold)' }}>
              Become a Host
            </Link>
          )}
          
          {isAuthenticated && user && (
            <>
              {user.role === 'guest' && <Link href={constants.ROUTES.GUEST_DASHBOARD} className="header__mobile-link" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>}
              {user.role === 'host' && <Link href={constants.ROUTES.HOST_DASHBOARD} className="header__mobile-link" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>}
              {user.role === 'admin' && <Link href={constants.ROUTES.ADMIN_DASHBOARD} className="header__mobile-link" onClick={() => setIsMenuOpen(false)}>Admin</Link>}
            </>
          )}
        </nav>
      )}
    </header>
  );
}