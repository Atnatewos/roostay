// frontend/components/review/ReviewForm.jsx
// Review creation form with animated star ratings for five categories
// Used after a completed booking to submit a review
// Supports optional written review text with character counter
// Author: Theron

'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import { apiClient, ApiError } from '@/lib/api';

/**
 * Review submission form for completed bookings.
 * Collects ratings for cleanliness, accuracy, communication, location, and value,
 * plus an optional text review with a 3000-character limit.
 *
 * @param {Object}   props
 * @param {string}   props.bookingId  - The completed booking ID to review
 * @param {Function} [props.onSuccess] - Callback after successful review submission
 * @param {Function} [props.onCancel]  - Callback to cancel review creation
 */
export default function ReviewForm({ bookingId, onSuccess, onCancel }) {
  // Rating state — each category starts at 0 (unrated)
  const [ratings, setRatings] = useState({
    cleanliness: 0,
    accuracy: 0,
    communication: 0,
    location: 0,
    value: 0,
  });

  // Optional written review text
  const [reviewText, setReviewText] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Updates a specific rating category when the user clicks a star.
   * Clears any previous error message on interaction.
   *
   * @param {string} category - Rating category key (e.g., 'cleanliness')
   * @param {number} value    - Rating value (1-5)
   */
  function handleRatingChange(category, value) {
    setRatings((prev) => ({ ...prev, [category]: value }));
    setError(null);
  }

  /**
   * Validates that all five categories have been rated.
   *
   * @returns {boolean} True if all categories have a non-zero rating
   */
  function isFormValid() {
    return Object.values(ratings).every((rating) => rating > 0);
  }

  /**
   * Submits the review to the API.
   * Sends all five ratings plus optional review text.
   *
   * @param {Event} e - Form submit event
   */
  async function handleSubmit(e) {
    e.preventDefault();

    if (!isFormValid()) {
      setError('Please provide a rating for all categories.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post('/reviews', {
        bookingId,
        cleanliness: ratings.cleanliness,
        accuracy: ratings.accuracy,
        communication: ratings.communication,
        location: ratings.location,
        value: ratings.value,
        reviewText: reviewText.trim() || null,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to submit review. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Rating category definitions — label and description for each category.
   */
  const ratingCategories = [
    {
      key: 'cleanliness',
      label: 'Cleanliness',
      description: 'How clean was the property?',
    },
    {
      key: 'accuracy',
      label: 'Accuracy',
      description: 'How accurate was the listing description?',
    },
    {
      key: 'communication',
      label: 'Communication',
      description: 'How well did the host communicate?',
    },
    {
      key: 'location',
      label: 'Location',
      description: 'How convenient was the location?',
    },
    {
      key: 'value',
      label: 'Value',
      description: 'How would you rate the value for money?',
    },
  ];

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      {/* Form Header */}
      <h3 className="review-form__title">Write a Review</h3>
      <p className="review-form__subtitle">
        Share your experience with this property
      </p>

      {/* Rating Categories — One row per category with interactive stars */}
      <div className="review-form__categories">
        {ratingCategories.map((category) => (
          <div key={category.key} className="review-form__category">
            <div className="review-form__category-info">
              <span className="review-form__category-label">
                {category.label}
              </span>
              <span className="review-form__category-desc">
                {category.description}
              </span>
            </div>
            <StarRating
              rating={ratings[category.key]}
              interactive
              size="md"
              onChange={(value) => handleRatingChange(category.key, value)}
            />
          </div>
        ))}
      </div>

      {/* Review Text — Optional written feedback */}
      <div className="review-form__text">
        <label htmlFor="review-text" className="review-form__label">
          Your Review (optional)
        </label>
        <textarea
          id="review-text"
          className="input input--textarea"
          placeholder="Tell others about your experience..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
          maxLength={3000}
        />
        <span className="review-form__char-count">
          {reviewText.length}/3000
        </span>
      </div>

      {/* Error Message — Shown on validation failure or API error */}
      {error && (
        <div className="review-form__error">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Action Buttons — Cancel + Submit */}
      <div className="review-form__actions">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} type="button">
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          type="submit"
          isLoading={isSubmitting}
          disabled={!isFormValid()}
        >
          Submit Review
        </Button>
      </div>
    </form>
  );
}