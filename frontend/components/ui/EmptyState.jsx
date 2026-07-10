// frontend/components/ui/EmptyState.jsx
// Empty state component for displaying messages when no data exists
// Supports custom icons, titles, descriptions, and action buttons
// Used in grids, lists, and pages when data is empty
'use client';

import Button from '@/components/ui/Button';
import Link from 'next/link';

/**
 * EmptyState Component
 * Displays a friendly message when no data exists.
 * Includes an icon, title, description, and optional action button.
 * 
 * @param {Object} props
 * @param {string} [props.icon='inbox'] - Icon name (inbox, search, calendar, heart, list)
 * @param {string} props.title - Main heading text
 * @param {string} props.description - Supporting description text
 * @param {string} [props.actionLabel] - Action button label
 * @param {string} [props.actionHref] - Action button link href
 * @param {Function} [props.onAction] - Action button click handler
 * @param {string} [props.className] - Additional CSS class names
 * 
 * @example
 * <EmptyState
 *   icon="search"
 *   title="No listings found"
 *   description="Try adjusting your search filters"
 *   actionLabel="Clear Filters"
 *   onAction={handleClearFilters}
 * />
 */
export default function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = '',
}) {
  // Icon SVG paths
  const icons = {
    inbox: (
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    heart: (
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    ),
    list: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </>
    ),
    booking: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
  };
  
  return (
    <div
      className={`empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="40"
          height="40"
          fill="none"
          stroke="var(--color-text-light)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icons[icon]}
        </svg>
      </div>
      
      {/* Title */}
      <h3
        style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </h3>
      
      {/* Description */}
      <p
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          maxWidth: '400px',
          lineHeight: '1.6',
          marginBottom: actionLabel ? '1.5rem' : '0',
        }}
      >
        {description}
      </p>
      
      {/* Action Button */}
      {actionLabel && (
        actionHref ? (
          <Link href={actionHref}>
            <Button variant="primary" size="md">
              {actionLabel}
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}