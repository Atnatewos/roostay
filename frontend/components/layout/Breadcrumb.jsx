// frontend/components/layout/Breadcrumb.jsx
// Breadcrumb navigation component
// Auto-generates from URL path with support for custom labels
// Displays current location in the site hierarchy
'use client';

import Link from 'next/link';
import useBreadcrumb from '@/hooks/useBreadcrumb';

/**
 * Breadcrumb Component
 * Displays navigation breadcrumbs based on the current URL.
 * Automatically generates labels from URL segments.
 * Supports custom labels via the data prop for dynamic segments.
 * 
 * @param {Object} props
 * @param {Object} [props.data] - Optional data for dynamic segment labels
 * @param {string} [props.className] - Additional CSS class names
 * 
 * @example
 * // Auto-generate from URL
 * <Breadcrumb />
 * 
 * @example
 * // Override dynamic labels
 * <Breadcrumb data={{ title: 'Modern Apartment in Bole' }} />
 */
export default function Breadcrumb({ data = {}, className = '' }) {
  const breadcrumbs = useBreadcrumb(data);
  
  // Don't render if only home
  if (breadcrumbs.length <= 1) {
    return null;
  }
  
  return (
    <nav
      className={`breadcrumb ${className}`}
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)',
        marginBottom: '1.5rem',
      }}
    >
      {breadcrumbs.map((item, index) => (
        <span key={item.href} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Separator (except for first item) */}
          {index > 0 && (
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ opacity: 0.5 }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          
          {/* Breadcrumb Link or Text */}
          {item.isLast ? (
            <span
              style={{
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
              aria-current="page"
            >
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              style={{
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}