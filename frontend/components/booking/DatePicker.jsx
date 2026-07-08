// frontend/components/booking/DatePicker.jsx
// Enhanced date range picker with blocked date labels and availability context
// Fetches blocked dates from the API and displays status labels (Booked/Pending)
// Groups consecutive blocked dates into ranges for cleaner display
// Author: Theron

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api';

/**
 * Enhanced DatePicker Component
 *
 * Displays a dual-month calendar for selecting check-in and check-out dates.
 * Fetches blocked date data from the API and renders visual indicators:
 *   - Gray with strikethrough = Confirmed booking (hard-blocked)
 *   - Yellow with warning    = Pending booking (soft-blocked, may expire)
 *   - Highlighted range      = Currently selected dates
 *
 * Also shows a legend and a list of blocked date ranges with status labels.
 *
 * @param {Object}        props
 * @param {string}        [props.checkIn]         - Currently selected check-in date (YYYY-MM-DD)
 * @param {string}        [props.checkOut]        - Currently selected check-out date (YYYY-MM-DD)
 * @param {Function}      props.onDateChange      - Callback with { checkIn, checkOut } on selection
 * @param {Array<string>} [props.blockedDates]    - Static array of blocked dates (fallback)
 * @param {string}        [props.listingId]       - Listing ID to fetch blocked dates for
 * @param {number}        [props.minNights]       - Minimum nights required
 * @param {number}        [props.maxNights]       - Maximum nights allowed
 * @param {string}        [props.bookingType]     - 'short_term' or 'long_term'
 */
export default function DatePicker({
  checkIn,
  checkOut,
  onDateChange,
  blockedDates: staticBlockedDates = [],
  listingId,
  minNights,
  maxNights,
  bookingType = 'short_term',
}) {

  // =========================================================================
  // STATE
  // =========================================================================

  // Calendar navigation — which month is currently displayed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  // Hover state — highlights dates between check-in and hover for range preview
  const [hoverDate, setHoverDate] = useState(null);

  // Selection phase — tracks whether user is picking check-in or check-out
  const [selectionPhase, setSelectionPhase] = useState(
    checkIn && checkOut ? 'complete' : 'checkIn'
  );

  // Blocked dates data fetched from the API — includes status labels
  const [apiBlockedDates, setApiBlockedDates] = useState([]);

  // Blocked date ranges — grouped consecutive dates for display
  const [blockedRanges, setBlockedRanges] = useState([]);

  // Loading state for the API call
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // =========================================================================
  // FETCH BLOCKED DATES FROM API
  // Runs when the listingId changes — fetches real-time availability data
  // =========================================================================
  useEffect(() => {
    if (!listingId) return;

    async function fetchBlockedDates() {
      setIsLoadingBlocked(true);
      try {
        const response = await apiClient.get(`/listings/${listingId}/blocked-dates`);

        if (response?.data) {
          // Store individual blocked dates for calendar rendering
          setApiBlockedDates(response.data.blockedDates || []);

          // Store grouped ranges for the summary display below the calendar
          setBlockedRanges(response.data.blockedRanges || []);
        }
      } catch (err) {
        // Silently fall back to static blocked dates if API fails
        console.error('Failed to fetch blocked dates:', err.message);
      } finally {
        setIsLoadingBlocked(false);
      }
    }

    fetchBlockedDates();
  }, [listingId]);

  // =========================================================================
  // MERGE BLOCKED DATES
  // Combines static blocked dates (props) with API-fetched blocked dates
  // Uses a Set for O(1) lookup performance
  // =========================================================================
  const blockedSet = useMemo(() => {
    const set = new Set();

    // Add static blocked dates from props
    staticBlockedDates.forEach((date) => set.add(date));

    // Add API-fetched blocked dates (both booked and pending)
    apiBlockedDates.forEach((item) => set.add(item.date));

    return set;
  }, [staticBlockedDates, apiBlockedDates]);

  // =========================================================================
  // BLOCKED DATE STATUS MAP
  // Maps each blocked date to its status label ('booked' or 'pending')
  // Used to determine which visual style to apply on the calendar
  // =========================================================================
  const blockedStatusMap = useMemo(() => {
    const map = {};
    apiBlockedDates.forEach((item) => {
      map[item.date] = item.status;
    });
    // Static blocked dates default to 'booked' status
    staticBlockedDates.forEach((date) => {
      if (!map[date]) {
        map[date] = 'booked';
      }
    });
    return map;
  }, [apiBlockedDates, staticBlockedDates]);

  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================

  /**
   * Formats a Date object into a YYYY-MM-DD string.
   *
   * @param {Date} date - The date to format
   * @returns {string} ISO date string (date portion only)
   */
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Checks if a given date is available for selection.
   * Dates are unavailable if they are in the past or blocked by a booking.
   *
   * @param {Date} date - The date to check
   * @returns {boolean} True if the date can be selected
   */
  function isDateAvailable(date) {
    const dateStr = formatDate(date);

    // Past dates are not available
    if (date < today) return false;

    // Blocked dates (booked or pending) are not available
    if (blockedSet.has(dateStr)) return false;

    return true;
  }

  /**
   * Gets the block status label for a specific date.
   *
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {string|null} 'booked', 'pending', or null if not blocked
   */
  function getBlockStatus(dateStr) {
    return blockedStatusMap[dateStr] || null;
  }

  /**
   * Checks if a date falls within the currently selected or hovered range.
   * Used to highlight the range between check-in and check-out.
   *
   * @param {Date} date - The date to check
   * @returns {boolean} True if the date is in the selected range
   */
  function isInRange(date) {
    if (!checkIn) return false;
    const end = checkOut || hoverDate;
    if (!end) return false;

    const d = new Date(date);
    const start = new Date(checkIn);
    const endDate = new Date(end);

    return d > start && d < endDate;
  }

  /**
   * Formats a blocked date range for display in the summary list.
   * Handles single-day and multi-day ranges differently.
   *
   * @param {Object} range - Range object with startDate, endDate, and status
   * @returns {string} Human-readable range description
   */
  function formatRange(range) {
    const start = new Date(range.startDate + 'T00:00:00');
    const end = new Date(range.endDate + 'T00:00:00');

    const startStr = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endStr = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    if (range.startDate === range.endDate) {
      return startStr;
    }

    return `${startStr} - ${endStr}`;
  }

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  /**
   * Handles date click for check-in/check-out selection.
   * Manages the two-phase selection: first click = check-in, second = check-out.
   * If user clicks a date before the current check-in, it resets to a new check-in.
   *
   * @param {Date} date - The clicked date
   */
  const handleDateClick = useCallback(
    (date) => {
      if (!isDateAvailable(date)) return;

      const dateStr = formatDate(date);

      if (selectionPhase === 'checkIn' || selectionPhase === 'complete') {
        // Start new selection — set check-in, clear check-out
        onDateChange({ checkIn: dateStr, checkOut: null });
        setSelectionPhase('checkOut');
      } else {
        // Second click — set check-out
        const start = new Date(checkIn);
        if (date <= start) {
          // Clicked before or on check-in — reset to new check-in
          onDateChange({ checkIn: dateStr, checkOut: null });
          setSelectionPhase('checkOut');
        } else {
          // Valid check-out — complete the selection
          onDateChange({ checkIn, checkOut: dateStr });
          setSelectionPhase('complete');
        }
      }
    },
    [checkIn, selectionPhase, onDateChange]
  );

  /**
   * Navigates to the previous month.
   * Disabled if already at or before the current month.
   */
  function goToPreviousMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  }

  /**
   * Navigates to the next month.
   */
  function goToNextMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  }

  // =========================================================================
  // CALENDAR GRID GENERATION
  // Generates a 2D array of dates (null for padding cells)
  // Each row represents a week, each cell a day
  // =========================================================================

  /**
   * Generates the calendar grid for a given month.
   * Pads the beginning of the month with null values to align with weekdays.
   *
   * @param {Date} monthStart - First day of the month
   * @returns {Array<Array<Date|null>>} 2D array representing the calendar grid
   */
  function generateMonthGrid(monthStart) {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();

    // Day of week for the 1st (0 = Sunday)
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    // Total days in this month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];
    let week = [];

    // Pad the first week with null values
    for (let i = 0; i < firstDayOfWeek; i++) {
      week.push(null);
    }

    // Fill in the days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(new Date(year, month, day));

      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }

    // Pad the last week with null values
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      grid.push(week);
    }

    return grid;
  }

  /**
   * Renders a single month calendar view.
   *
   * @param {Date}    monthStart       - First day of the month to render
   * @param {boolean} [showHeader=true] - Whether to show the month/year title
   * @returns {JSX.Element} Month calendar element
   */
  function renderMonth(monthStart, showHeader = true) {
    const grid = generateMonthGrid(monthStart);

    return (
      <div className="date-picker__month">
        {/* Month Title */}
        {showHeader && (
          <h4 className="date-picker__month-title">
            {MONTHS[monthStart.getMonth()]} {monthStart.getFullYear()}
          </h4>
        )}

        {/* Weekday Headers */}
        <div className="date-picker__weekdays">
          {DAYS.map((day) => (
            <span key={day} className="date-picker__weekday">
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="date-picker__days">
          {grid.map((week, weekIndex) => (
            <div key={weekIndex} className="date-picker__week">
              {week.map((date, dayIndex) => {
                // Render empty cell for padding
                if (!date) {
                  return (
                    <span
                      key={dayIndex}
                      className="date-picker__day date-picker__day--empty"
                    />
                  );
                }

                const dateStr = formatDate(date);
                const isToday = dateStr === formatDate(today);
                const isCheckIn = dateStr === checkIn;
                const isCheckOut = dateStr === checkOut;
                const inRange = isInRange(date);
                const available = isDateAvailable(date);
                const blockStatus = getBlockStatus(dateStr);

                // Build CSS class names based on date state
                const classNames = [
                  'date-picker__day',
                  isToday ? 'date-picker__day--today' : '',
                  isCheckIn ? 'date-picker__day--checkin' : '',
                  isCheckOut ? 'date-picker__day--checkout' : '',
                  inRange ? 'date-picker__day--in-range' : '',
                  !available ? 'date-picker__day--unavailable' : '',
                  blockStatus === 'booked' ? 'date-picker__day--booked' : '',
                  blockStatus === 'pending' ? 'date-picker__day--pending' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                // Build tooltip label for blocked dates
                let tooltip = '';
                if (blockStatus === 'booked') tooltip = 'Booked — not available';
                if (blockStatus === 'pending') tooltip = 'Pending booking — may become available';

                return (
                  <button
                    key={dayIndex}
                    className={classNames}
                    onClick={() => handleDateClick(date)}
                    onMouseEnter={() => {
                      if (available && selectionPhase === 'checkOut') {
                        setHoverDate(dateStr);
                      }
                    }}
                    onMouseLeave={() => setHoverDate(null)}
                    disabled={!available}
                    type="button"
                    aria-label={`${dateStr}${tooltip ? ' — ' + tooltip : ''}`}
                    title={tooltip || dateStr}
                  >
                    {date.getDate()}

                    {/* Status indicator dot for blocked dates */}
                    {!available && blockStatus && (
                      <span
                        className={`date-picker__day-dot date-picker__day-dot--${blockStatus}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  const nextMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    1
  );

  return (
    <div className="date-picker">
      {/* Month Navigation */}
      <div className="date-picker__navigation">
        <button
          className="date-picker__nav-btn"
          onClick={goToPreviousMonth}
          disabled={
            currentMonth <= new Date(today.getFullYear(), today.getMonth(), 1)
          }
          aria-label="Previous month"
          type="button"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          className="date-picker__nav-btn"
          onClick={goToNextMonth}
          aria-label="Next month"
          type="button"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Dual Calendar Grids */}
      <div className="date-picker__calendars">
        {renderMonth(currentMonth)}
        {renderMonth(nextMonth)}
      </div>

      {/* Color Legend */}
      <div className="date-picker__legend">
        <span className="date-picker__legend-item">
          <span className="date-picker__legend-dot date-picker__legend-dot--available" />
          Available
        </span>
        <span className="date-picker__legend-item">
          <span className="date-picker__legend-dot date-picker__legend-dot--selected" />
          Selected
        </span>
        <span className="date-picker__legend-item">
          <span className="date-picker__legend-dot date-picker__legend-dot--booked" />
          Booked
        </span>
        <span className="date-picker__legend-item">
          <span className="date-picker__legend-dot date-picker__legend-dot--pending" />
          Pending
        </span>
      </div>

      {/* Blocked Date Ranges Summary */}
      {blockedRanges.length > 0 && (
        <div className="date-picker__blocked-summary">
          <p className="date-picker__blocked-title">
            {blockedRanges.length} date range{blockedRanges.length !== 1 ? 's' : ''} unavailable:
          </p>
          <ul className="date-picker__blocked-list">
            {blockedRanges.map((range, index) => (
              <li
                key={index}
                className={`date-picker__blocked-item date-picker__blocked-item--${range.status}`}
              >
                <span className="date-picker__blocked-dates">
                  {formatRange(range)}
                </span>
                <span className="date-picker__blocked-status">
                  {range.status === 'booked' ? 'Booked' : 'Pending'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Loading indicator while fetching blocked dates */}
      {isLoadingBlocked && (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', textAlign: 'center', marginTop: '0.5rem' }}>
          Checking availability...
        </p>
      )}
    </div>
  );
}