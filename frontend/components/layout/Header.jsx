'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import useAuth from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import constants from '@/lib/constants';

export default function Header() {
  const { user, isAuthenticated, isHost, isAdmin, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isUserMenuOpen && !e.target.closest('.header__user-menu')) setIsUserMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isUserMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const headerClass = `header ${isScrolled ? 'header--scrolled' : ''}`;

  return (
    <header className={headerClass}>
      <div className="container header__container">
        <Link href="/" className="header__logo" onClick={closeMobileMenu}>
          <span className="header__logo-text">ROOSTAY</span>
        </Link>

        <nav className="header__nav">
          <Link href="/listings" className="header__nav-link">Browse</Link>
          {isAuthenticated && isHost && <Link href="/host/dashboard" className="header__nav-link">Host Dashboard</Link>}
          {isAuthenticated && isAdmin && <Link href="/admin/dashboard" className="header__nav-link">Admin</Link>}
        </nav>

        <div className="header__actions">
          {isAuthenticated ? (
            <div className="header__user-menu">
              <button className="header__user-trigger" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} aria-expanded={isUserMenuOpen}>
                <Avatar name={`${user?.firstName || ''} ${user?.lastName || ''}`} size="sm" />
                <span className="header__user-name">{user?.firstName || 'User'}</span>
              </button>
              {isUserMenuOpen && (
                <div className="header__dropdown">
                  <Link href={isHost ? '/host/dashboard' : '/guest/dashboard'} className="header__dropdown-item" onClick={() => setIsUserMenuOpen(false)}>Dashboard</Link>
                  <Link href="/guest/bookings" className="header__dropdown-item" onClick={() => setIsUserMenuOpen(false)}>My Bookings</Link>
                  <Link href="/guest/favorites" className="header__dropdown-item" onClick={() => setIsUserMenuOpen(false)}>Favorites</Link>
                  <Link href="/guest/profile" className="header__dropdown-item" onClick={() => setIsUserMenuOpen(false)}>Profile</Link>
                  <hr className="header__dropdown-divider" />
                  <button className="header__dropdown-item header__dropdown-item--danger" onClick={() => { setIsUserMenuOpen(false); logout(); }}>Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="header__auth-buttons">
              <Button variant="outline" size="sm" href="/login">Sign In</Button>
              <Button variant="primary" size="sm" href="/register">Sign Up</Button>
            </div>
          )}
          <button className="header__mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
            <span className={`header__hamburger ${isMobileMenuOpen ? 'header__hamburger--open' : ''}`}><span /><span /><span /></span>
          </button>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="header__mobile-menu">
          <nav className="header__mobile-nav">
            <Link href="/listings" className="header__mobile-link" onClick={closeMobileMenu}>Browse Listings</Link>
            {isAuthenticated ? (
              <>
                <Link href={isHost ? '/host/dashboard' : '/guest/dashboard'} className="header__mobile-link" onClick={closeMobileMenu}>Dashboard</Link>
                <Link href="/guest/bookings" className="header__mobile-link" onClick={closeMobileMenu}>My Bookings</Link>
                <button className="header__mobile-link header__mobile-link--danger" onClick={() => { closeMobileMenu(); logout(); }}>Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="header__mobile-link" onClick={closeMobileMenu}>Sign In</Link>
                <Link href="/register" className="header__mobile-link" onClick={closeMobileMenu}>Sign Up</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
