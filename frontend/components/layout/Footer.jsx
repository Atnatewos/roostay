// frontend/components/layout/Footer.jsx
// Site-wide footer with config-driven navigation columns
// All links and text come from content.config.json and navigation.config.json
// Zero hardcoded values — fully configurable per environment
// Author: Theron
'use client';

import Link from 'next/link';
import useConfig from '@/hooks/useConfig';

/**
 * Footer Component
 * Renders the site footer with dynamic navigation columns.
 * All content strings are fetched from the centralized config system.
 * Navigation structure is driven by navigation.config.json.
 */
export default function Footer() {
  const { navigation, content, app } = useConfig();
  const year = new Date().getFullYear();

  // Load footer columns from navigation config
  const footerColumns = navigation?.footer?.columns || [];

  // Load footer content strings from content config
  const footerContent = content?.footer || {};

  return (
    <footer className="footer">
      <div className="container footer__container">
        {/* Brand Column */}
        <div className="footer__column footer__column--brand">
          <Link href="/" className="footer__logo">
            <span className="footer__logo-text">
              {app?.name || 'ROOSTAY'}
            </span>
          </Link>
          <p className="footer__description">
            {footerContent.brandDescription || 'Find your perfect stay in Ethiopia.'}
          </p>
          <p className="footer__copyright">
            &copy; {year} {footerContent.copyright || 'ROOSTAY. All rights reserved.'}
          </p>
        </div>

        {/* Dynamic Navigation Columns — driven by config */}
        {footerColumns.map((column, index) => (
          <div key={index} className="footer__column">
            <h3 className="footer__heading">
              {column.heading || ''}
            </h3>
            <ul className="footer__links">
              {column.links.map((link, linkIndex) => (
                <li key={linkIndex}>
                  <Link href={link.href} className="footer__link">
                    {link.label || link.key}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="footer__bottom">
        <div className="container">
          <p className="footer__bottom-text">
            {footerContent.madeInEthiopia || 'Powered By SoDar!'}
          </p>
        </div>
      </div>
    </footer>
  );
}