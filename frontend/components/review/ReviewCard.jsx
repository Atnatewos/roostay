// frontend/components/review/ReviewCard.jsx
// Individual review display card with ratings, text, and host response
// Shows reviewer avatar, 5-category rating bars, review text, and host reply
// Used in listing detail pages and review lists
// Author: Theron

import StarRating from '@/components/ui/StarRating';
import Avatar from '@/components/ui/Avatar';

/**
 * Review card component displaying a single guest review.
 * Shows reviewer info, star ratings with visual bars, review text,
 * and optional host response with timestamp.
 *
 * @param {Object} props
 * @param {Object} props.review - Review data from API
 * @param {string} props.review.id - Unique review identifier
 * @param {number} props.review.rating_overall - Overall rating (1-5)
 * @param {number} props.review.rating_cleanliness - Cleanliness score
 * @param {number} props.review.rating_accuracy - Accuracy score
 * @param {number} props.review.rating_communication - Communication score
 * @param {number} props.review.rating_location - Location score
 * @param {number} props.review.rating_value - Value score
 * @param {string} [props.review.review_text] - Written review content
 * @param {string} [props.review.host_response] - Host's response text
 * @param {string} [props.review.host_response_at] - Host response timestamp
 * @param {string} [props.review.reviewer_first_name] - Reviewer first name
 * @param {string} [props.review.reviewer_last_name] - Reviewer last name
 * @param {string} [props.review.reviewer_image_url] - Reviewer avatar URL
 * @param {string} [props.review.created_at] - Review creation timestamp
 */
export default function ReviewCard({ review }) {
  // Format the review date for display — e.g., "July 22, 2026"
  const reviewDate = new Date(review.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Build reviewer display name, fall back to "Anonymous" if no name provided
  const reviewerName =
    `${review.reviewer_first_name || ''} ${review.reviewer_last_name || ''}`.trim() ||
    'Anonymous';

  /**
   * Rating categories with their API field names and display labels.
   * Each renders as a labeled progress bar showing the score out of 5.
   */
  const ratingCategories = [
    { key: 'rating_cleanliness', label: 'Cleanliness' },
    { key: 'rating_accuracy', label: 'Accuracy' },
    { key: 'rating_communication', label: 'Communication' },
    { key: 'rating_location', label: 'Location' },
    { key: 'rating_value', label: 'Value' },
  ];

  return (
    <div className="review-card">
      {/* Reviewer Info Row — Avatar, Name, Date, Overall Rating */}
      <div className="review-card__header">
        <Avatar
          src={review.reviewer_image_url}
          name={reviewerName}
          size="md"
        />
        <div className="review-card__reviewer">
          <span className="review-card__name">{reviewerName}</span>
          <span className="review-card__date">{reviewDate}</span>
        </div>
        <div className="review-card__overall-rating">
          <StarRating rating={review.rating_overall} size="sm" />
        </div>
      </div>

      {/* Category Rating Bars — Visual 0-5 progress for each category */}
      <div className="review-card__ratings">
        {ratingCategories.map((category) => {
          const score = review[category.key] || 0;
          const percent = (score / 5) * 100;

          return (
            <div key={category.key} className="review-card__rating-item">
              <span className="review-card__rating-label">
                {category.label}
              </span>
              <div className="review-card__rating-bar">
                <div
                  className="review-card__rating-fill"
                  style={{
                    width: `${percent}%`,
                    transition: 'width 600ms cubic-bezier(0.19, 1, 0.22, 1)',
                  }}
                />
              </div>
              <span className="review-card__rating-value">
                {score.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Review Text — Only rendered if the guest wrote a review */}
      {review.review_text && (
        <p className="review-card__text">{review.review_text}</p>
      )}

      {/* Host Response — Shown in a distinct card when the host has replied */}
      {review.host_response && (
        <div className="review-card__response">
          <div className="review-card__response-header">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="review-card__response-label">
              Response from host
            </span>
            {review.host_response_at && (
              <span className="review-card__response-date">
                {new Date(review.host_response_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
          <p className="review-card__response-text">
            {review.host_response}
          </p>
        </div>
      )}
    </div>
  );
}