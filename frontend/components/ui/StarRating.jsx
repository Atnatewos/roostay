// frontend/components/ui/StarRating.jsx
// Animated star rating component with hover preview and interactive selection
// Supports read-only display mode and interactive rating mode
// Smooth fill transition on hover for a premium feel
// Author: Theron

'use client';

import { useState } from 'react';

/**
 * Star rating component for displaying and selecting ratings.
 * In interactive mode, users can hover to preview and click to select.
 * In display mode, shows filled/empty stars with optional numeric value.
 *
 * @param {Object}   props
 * @param {number}   [props.rating]      - Current rating value (0-5)
 * @param {number}   [props.maxStars]    - Total number of stars to display
 * @param {boolean}  [props.interactive] - Whether stars can be clicked to rate
 * @param {Function} [props.onChange]    - Callback when a star is clicked (receives 1-5)
 * @param {string}   [props.size]        - Size variant: 'sm', 'md', or 'lg'
 * @param {boolean}  [props.showValue]   - Whether to show numeric value next to stars
 */
export default function StarRating({
  rating = 0,
  maxStars = 5,
  interactive = false,
  onChange,
  size = 'md',
  showValue = false,
}) {
  // Track which star the user is hovering over for preview
  const [hoverRating, setHoverRating] = useState(0);

  // Build the CSS class string based on props
  const classNames = [
    'star-rating',
    `star-rating--${size}`,
    interactive ? 'star-rating--interactive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      {/* Star Display */}
      <div
        className="star-rating__stars"
        onMouseLeave={() => {
          if (interactive) setHoverRating(0);
        }}
      >
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          // A star is filled if the hover rating OR the actual rating is >= its value
          const isFilled = starValue <= (hoverRating || rating);

          return (
            <span
              key={index}
              className={`star-rating__star ${
                isFilled
                  ? 'star-rating__star--filled'
                  : 'star-rating__star--empty'
              }`}
              onClick={() => {
                if (interactive && onChange) {
                  onChange(starValue);
                }
              }}
              onMouseEnter={() => {
                if (interactive) {
                  setHoverRating(starValue);
                }
              }}
              role={interactive ? 'button' : 'presentation'}
              aria-label={
                interactive ? `Rate ${starValue} out of ${maxStars}` : undefined
              }
              tabIndex={interactive ? 0 : undefined}
              onKeyDown={(e) => {
                if (interactive && onChange && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onChange(starValue);
                }
              }}
            >
              ★
            </span>
          );
        })}
      </div>

      {/* Numeric Value — Optional display next to stars */}
      {showValue && (
        <span className="star-rating__value">
          {rating > 0 ? rating.toFixed(1) : '—'}
        </span>
      )}
    </div>
  );
}