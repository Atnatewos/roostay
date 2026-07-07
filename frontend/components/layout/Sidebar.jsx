'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import useAuth from '@/hooks/useAuth';
import constants from '@/lib/constants';

export default function Sidebar({ role }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (path) => path === pathname || (path !== '/' && pathname.startsWith(path));

  const navItems = {
    guest: [
      { label: 'Dashboard', href: '/guest/dashboard' },
      { label: 'My Bookings', href: '/guest/bookings' },
      { label: 'Favorites', href: '/guest/favorites' },
      { label: 'Profile', href: '/guest/profile' },
    ],
    host: [
      { label: 'Dashboard', href: '/host/dashboard' },
      { label: 'My Listings', href: '/host/listings' },
      { label: 'Create Listing', href: '/host/listings/create' },
      { label: 'Bookings', href: '/host/bookings' },
      { label: 'Withdrawals', href: '/host/withdrawals' },
    ],
    admin: [
      { label: 'Dashboard', href: '/admin/dashboard' },
      { label: 'Users', href: '/admin/users' },
      { label: 'Listings', href: '/admin/listings' },
      { label: 'Payments', href: '/admin/payments' },
      { label: 'Withdrawals', href: '/admin/withdrawals' },
    ],
  };

  const items = navItems[role] || [];

  return (
    <aside className="sidebar">
      <div className="sidebar__user">
        <div className="sidebar__user-avatar">{user?.firstName?.charAt(0) || 'U'}</div>
        <div className="sidebar__user-info">
          <p className="sidebar__user-name">{user?.firstName} {user?.lastName}</p>
          <p className="sidebar__user-role">{role === 'admin' ? 'Administrator' : role === 'host' ? 'Host' : 'Guest'}</p>
        </div>
      </div>
      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list">
          {items.map((item) => (
            <li key={item.href} className="sidebar__nav-item">
              <Link href={item.href} className={`sidebar__nav-link ${isActive(item.href) ? 'sidebar__nav-link--active' : ''}`}>
                <span className="sidebar__nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar__footer">
        <Link href="/" className="sidebar__footer-link">Back to Site</Link>
        <button className="sidebar__footer-link sidebar__footer-link--danger" onClick={logout}>Sign Out</button>
      </div>
    </aside>
  );
}
