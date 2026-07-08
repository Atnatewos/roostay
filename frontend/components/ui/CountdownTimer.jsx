// frontend/components/ui/CountdownTimer.jsx
// Reusable countdown timer component with visual progress indicator
// Displays remaining time in MM:SS format with color transitions
// Changes color from normal → warning → danger as time runs out
// Author: Theron

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Countdown Timer Component
 * Displays a countdown from a given number of minutes, updating every second.
 * Provides visual feedback through color transitions as time decreases.
 * Automatically calls onExpire callback when the timer reaches zero.
 *
 * @param {Object} props
 * @param {number} props.minutes        - Total countdown duration in minutes
 * @param {Date}   [props.expiresAt]    - Specific expiry date/time (overrides minutes)
 * @param {Function} [props.onExpire]   - Callback fired when the countdown reaches zero
 * @param {Function} [props.onTick]     - Callback fired on each second tick with remaining seconds
 * @param {boolean} [props.showIcon=true] - Whether to show the clock icon
 * @param {string}  [props.size='md']   - Display size (sm, md, lg)
 * @param {string}  [props.className]   - Additional CSS class names
 */
export default function CountdownTimer({
  minutes,
  expiresAt,
  onExpire,
  onTick,
  showIcon = true,
  size = 'md',
  className = '',
}) {

  // Calculate initial seconds from minutes or expiresAt timestamp
  const calculateInitialSeconds = useCallback(() => {
    if (expiresAt) {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    return (minutes || 30) * 60;
  }, [minutes, expiresAt]);

  // State for remaining seconds — drives the entire countdown display
  const [remainingSeconds, setRemainingSeconds] = useState(calculateInitialSeconds);

  // Track total duration for percentage calculations
  const totalSeconds = calculateInitialSeconds();

  // Ref to track whether the component is still mounted
  const isMounted = useRef(true);

  // Ref to store the interval ID for cleanup
  const intervalRef = useRef(null);

  // Ref to prevent duplicate onExpire calls
  const hasExpired = useRef(false);

  /**
   * Starts the countdown interval that decrements every second.
   * Cleans up the interval on component unmount to prevent memory leaks.
   * Calls onExpire when countdown reaches zero.
   */
  useEffect(() => {
    isMounted.current = true;
    hasExpired.current = false;

    // Reset remaining seconds when minutes or expiresAt change
    setRemainingSeconds(calculateInitialSeconds());

    intervalRef.current = setInterval(() => {
      if (!isMounted.current) return;

      setRemainingSeconds((prev) => {
        const next = prev - 1;

        // Fire onTick callback with the new remaining seconds
        if (onTick && next >= 0) {
          onTick(next);
        }

        // Handle expiry when countdown reaches zero
        if (next <= 0 && !hasExpired.current) {
          hasExpired.current = true;

          // Clear the interval to stop the countdown
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Fire the expiry callback
          if (onExpire) {
            onExpire();
          }
        }

        return Math.max(0, next);
      });
    }, 1000);

    // Cleanup function — runs on component unmount or dependency change
    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [minutes, expiresAt, calculateInitialSeconds, onExpire, onTick]);

  /**
   * Formats seconds into a human-readable MM:SS string.
   *
   * @param {number} totalSeconds - Total seconds to format
   * @returns {string} Formatted time string (e.g., "29:45")
   */
  function formatTime(totalSeconds) {
    if (totalSeconds <= 0) return '00:00';

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    const minsStr = String(mins).padStart(2, '0');
    const secsStr = String(secs).padStart(2, '0');

    return `${minsStr}:${secsStr}`;
  }

  /**
   * Returns a human-readable label for the remaining time.
   * Switches between minutes and seconds for readability.
   *
   * @param {number} totalSeconds - Total remaining seconds
   * @returns {string} Human-readable time label
   */
  function getTimeLabel(totalSeconds) {
    if (totalSeconds <= 0) return 'Expired';
    if (totalSeconds < 60) return `${totalSeconds}s remaining`;
    const mins = Math.ceil(totalSeconds / 60);
    return `${mins} min${mins !== 1 ? 's' : ''} remaining`;
  }

  /**
   * Calculates the percentage of time remaining for the progress bar.
   *
   * @returns {number} Percentage value between 0 and 100
   */
  function getProgressPercent() {
    if (totalSeconds <= 0) return 0;
    return Math.round((remainingSeconds / totalSeconds) * 100);
  }

  /**
   * Determines the CSS class for color based on remaining time.
   * Transitions through three phases: normal → warning → danger.
   *
   * @returns {string} CSS modifier class for color state
   */
  function getColorState() {
    if (remainingSeconds <= 0) return 'countdown-timer--expired';
    if (remainingSeconds <= 300) return 'countdown-timer--danger';   // Last 5 minutes
    if (remainingSeconds <= 600) return 'countdown-timer--warning';  // Last 10 minutes
    return 'countdown-timer--normal';
  }

  // Build the component class names from size and color state
  const containerClasses = [
    'countdown-timer',
    `countdown-timer--${size}`,
    getColorState(),
    className,
  ].filter(Boolean).join(' ');

  const progressPercent = getProgressPercent();

  return (
    <div className={containerClasses} role="timer" aria-live="polite" aria-label={`Countdown: ${getTimeLabel(remainingSeconds)}`}>
      {/* Time Display */}
      <div className="countdown-timer__display">
        {/* Clock Icon */}
        {showIcon && (
          <svg
            className="countdown-timer__icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )}

        {/* Time Value */}
        <span className="countdown-timer__time">
          {formatTime(remainingSeconds)}
        </span>

        {/* Text Label */}
        <span className="countdown-timer__label">
          {getTimeLabel(remainingSeconds)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="countdown-timer__progress">
        <div
          className="countdown-timer__progress-bar"
          style={{
            width: `${progressPercent}%`,
            transition: 'width 1s linear',
          }}
          role="progressbar"
          aria-valuenow={remainingSeconds}
          aria-valuemin={0}
          aria-valuemax={totalSeconds}
        />
      </div>
    </div>
  );
}