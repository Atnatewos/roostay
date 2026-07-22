// frontend/components/layout/Header.jsx
// Main navigation header with responsive hamburger menu
// All navigation items are driven by navigation.config.json via useConfig()
// Feature flags control visibility of "Become a Host" and other links
// Author: Theron
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import useConfig from '@/hooks/useConfig';
import NotificationBell from '@/components/notifications/NotificationBell';
import constants from '@/lib/constants';

/**
 * Header Component
 * Main navigation bar with responsive design.
 * Navigation items are rendered from config — no hardcoded links.
 * Feature flags control which links appear for each role.
 */
export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { navigation, isEnabled } = useConfig();

  // Local UI state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const headerRef = useRef(null);

  /**
   * Closes all open dropdowns.
   * Used when clicking outside the header or navigating away.
   */
  function closeAllDropdowns() {
    setIsUserMenuOpen(false);
    setIsNotificationOpen(false);
  }

  /**
   * Toggles the user menu dropdown.
   * Closes the notification dropdown if open (mutual exclusion).
   */
  function handleUserMenuToggle() {
    setIsNotificationOpen(false);
    setIsUserMenuOpen((prev) => !prev);
  }

  /**
   * Handles notification dropdown toggle from NotificationBell.
   * Closes the user menu if open (mutual exclusion).
   *
   * @param {boolean} isOpen - Whether the notification dropdown is now open
   */
  function handleNotificationToggle(isOpen) {
    setIsUserMenuOpen(false);
    setIsNotificationOpen(isOpen);
  }

  /**
   * Closes all dropdowns when clicking outside the header.
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        closeAllDropdowns();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Logs out and redirects to the home page.
   */
  async function handleLogout() {
    await logout();
    router.push(constants.ROUTES.HOME);
  }

  /**
   * Determines which navigation items to show based on the user's role.
   * Falls back to public navigation if the user is not authenticated.
   * Feature flags are checked via isEnabled() from config.
   *
   * @returns {Array} Array of navigation item objects
   */
  function getNavItems() {
    // Load navigation config from the centralized config system
    const headerConfig = navigation?.header || {};

    if (!isAuthenticated || !user) {
      return headerConfig.public || [];
    }

    switch (user.role) {
      case 'guest':
        return headerConfig.guest || [];
      case 'host':
        return headerConfig.host || [];
      case 'admin':
        return headerConfig.admin || [];
      default:
        return headerConfig.public || [];
    }
  }

  /**
   * Determines which user dropdown items to show based on role.
   *
   * @returns {Array} Array of dropdown link objects
   */
  function getDropdownItems() {
    const dropdownConfig = navigation?.header?.userDropdown || {};

    if (!isAuthenticated || !user) return [];

    switch (user.role) {
      case 'guest':
        return dropdownConfig.guest || [];
      case 'host':
        return dropdownConfig.host || [];
      case 'admin':
        return dropdownConfig.admin || [];
      default:
        return [];
    }
  }

  const navItems = getNavItems();
  const dropdownItems = getDropdownItems();

  return (
    <header className="header" ref={headerRef}>
      <div className="header__container">
        {/* Logo */}
        <Link href={constants.ROUTES.HOME} className="header__logo">
          ROOSTAY
        </Link>

        {/* Desktop Navigation — dynamically rendered from config */}
        <nav className="header__nav" aria-label="Main navigation">
          {navItems.map((item) => {
            // Skip items that have a feature flag requirement that is not met
            if (item.featureFlag && !isEnabled(item.featureFlag)) {
              return null;
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`header__link${item.highlight ? ' header__link--highlight' : ''}`}
                style={
                  item.highlight
                    ? {
                        color: 'var(--color-primary)',
                        fontWeight: 'var(--font-weight-semibold)',
                      }
                    : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Notifications + User Menu */}
        <div className="header__actions">
          {/* Notification Bell — only rendered when the feature is enabled */}
          {isEnabled('notificationsEnabled') && (
            <NotificationBell
              isAuthenticated={isAuthenticated}
              isOpen={isNotificationOpen}
              onToggle={handleNotificationToggle}
            />
          )}

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
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isUserMenuOpen && (
                <div className="header__dropdown">
                  <div className="header__dropdown-header">
                    <p className="header__dropdown-name">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="header__dropdown-email">{user.email}</p>
                  </div>

                  <div className="header__dropdown-menu">
                    {dropdownItems.map((item) => {
                      // Skip items with unmet feature flag requirements
                      if (item.featureFlag && !isEnabled(item.featureFlag)) {
                        return null;
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="header__dropdown-link"
                          onClick={closeAllDropdowns}
                          style={
                            item.highlight
                              ? {
                                  color: 'var(--color-primary)',
                                  fontWeight: 'var(--font-weight-semibold)',
                                }
                              : undefined
                          }
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                    {/* Profile Settings is always available for authenticated users */}
                    <Link
                      href={constants.ROUTES.GUEST_PROFILE}
                      className="header__dropdown-link"
                      onClick={closeAllDropdowns}
                    >
                      Profile Settings
                    </Link>
                  </div>

                  <div className="header__dropdown-footer">
                    <button
                      type="button"
                      onClick={() => {
                        closeAllDropdowns();
                        handleLogout();
                      }}
                      className="header__dropdown-link header__dropdown-link--logout"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="header__auth-links">
              <Link href={constants.ROUTES.LOGIN} className="header__link">
                Login
              </Link>
              <Link href={constants.ROUTES.REGISTER} className="header__button">
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            onClick={() => {
              closeAllDropdowns();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="header__menu-toggle"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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

      {/* Mobile Navigation — dynamically rendered from config */}
      {isMenuOpen && (
        <nav className="header__mobile-nav" aria-label="Mobile navigation">
          {navItems.map((item) => {
            if (item.featureFlag && !isEnabled(item.featureFlag)) {
              return null;
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="header__mobile-link"
                onClick={() => setIsMenuOpen(false)}
                style={
                  item.highlight
                    ? {
                        color: 'var(--color-primary)',
                        fontWeight: 'var(--font-weight-semibold)',
                      }
                    : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}