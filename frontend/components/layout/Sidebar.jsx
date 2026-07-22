// frontend/components/layout/Sidebar.jsx
// Reusable sidebar navigation component for guest, host, and admin dashboards
// All navigation items are driven by navigation.config.json via useConfig()
// Active state is determined by the current URL path
// Logo image is loaded from branding.config.json via useConfig()
// Author: Theron
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import useAuth from '@/hooks/useAuth';
import useConfig from '@/hooks/useConfig';

/**
 * Sidebar Component
 * Renders role-specific navigation with active state highlighting.
 * All navigation items come from config — zero hardcoded links.
 * Supports guest, host, and admin roles.
 *
 * @param {Object} props
 * @param {string} props.role - User role: 'guest', 'host', or 'admin'
 */
export default function Sidebar({ role }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { navigation, branding } = useConfig();

  /**
   * Determines if a navigation link is currently active.
   * Matches exact paths and handles nested routes (e.g., /admin/listings/123 matches /admin/listings).
   *
   * @param {string} path - The navigation link path
   * @returns {boolean} Whether the path is active
   */
  function isActive(path) {
    if (path === pathname) return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  }

  // Load sidebar navigation items from config based on user role
  const sidebarConfig = navigation?.sidebar || {};
  const navItems = sidebarConfig[role] || [];

  // Derive sidebar logo from branding config
  const sidebarLogoPath = branding?.logos?.header || null;

  /**
   * Returns a human-readable role label for display.
   *
   * @param {string} userRole - The user's role
   * @returns {string} Human-readable role label
   */
  function getRoleLabel(userRole) {
    const roleLabels = {
      admin: 'Administrator',
      host: 'Host',
      guest: 'Guest',
    };
    return roleLabels[userRole] || 'User';
  }

  return (
    <aside className="sidebar">
      {/* Sidebar Header — Logo and User Info */}
      <div className="sidebar__header">
        <Link href="/" className="sidebar__logo">
          {sidebarLogoPath ? (
            <img
              src={sidebarLogoPath}
              alt="ROOSTAY"
              className="sidebar__logo-image"
              width="120"
              height="34"
            />
          ) : (
            <span className="sidebar__logo-text">ROOSTAY</span>
          )}
        </Link>
      </div>

      {/* User Profile Section */}
      <div className="sidebar__user">
        <div className="sidebar__user-avatar">
          {user?.firstName?.charAt(0) || 'U'}
        </div>
        <div className="sidebar__user-info">
          <p className="sidebar__user-name">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="sidebar__user-role">
            {getRoleLabel(role)}
          </p>
        </div>
      </div>

      {/* Navigation Links — dynamically rendered from config */}
      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list">
          {navItems.map((item) => (
            <li key={item.href} className="sidebar__nav-item">
              <Link
                href={item.href}
                className={`sidebar__nav-link ${
                  isActive(item.href) ? 'sidebar__nav-link--active' : ''
                }`}
              >
                {item.icon && (
                  <span className="sidebar__nav-icon" data-icon={item.icon} />
                )}
                <span className="sidebar__nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer — Back to Site and Sign Out */}
      <div className="sidebar__footer">
        <Link href="/" className="sidebar__footer-link">
          Back to Site
        </Link>
        <button
          className="sidebar__footer-link sidebar__footer-link--danger"
          onClick={logout}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}