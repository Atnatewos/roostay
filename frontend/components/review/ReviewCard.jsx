// frontend/components/review/ReviewCard.jsx
// Individual review display card with ratings, text, and host response
// Used in listing detail pages and review lists

const StarRating = require('@components/ui/StarRating').default;
const Avatar = require('@components/ui/Avatar').default;

/**
 * Review card component displaying a single guest review.
 * Shows reviewer info, star ratings, review text, and optional host response.
 *
 * @param {Object} props
 * @param {Object} props.review - Review data from API
 */
function ReviewCard({ review }) {
  const reviewDate = new Date(review.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const reviewerName = `${review.reviewer_first_name || ''} ${review.reviewer_last_name || ''}`.trim() || 'Anonymous';

  return (
    <div className="review-card">
      {/* Reviewer Info */}
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

      {/* Category Ratings */}
      <div className="review-card__ratings">
        <div className="review-card__rating-item">
          <span className="review-card__rating-label">Cleanliness</span>
          <div className="review-card__rating-bar">
            <div
              className="review-card__rating-fill"
              style={{ width: `${(review.rating_cleanliness / 5) * 100}%` }}
            />
          </div>
          <span className="review-card__rating-value">{review.rating_cleanliness}.0</span>
        </div>
        <div className="review-card__rating-item">
          <span className="review-card__rating-label">Accuracy</span>
          <div className="review-card__rating-bar">
            <div
              className="review-card__rating-fill"
              style={{ width: `${(review.rating_accuracy / 5) * 100}%` }}
            />
          </div>
          <span className="review-card__rating-value">{review.rating_accuracy}.0</span>
        </div>
        <div className="review-card__rating-item">
          <span className="review-card__rating-label">Communication</span>
          <div className="review-card__rating-bar">
            <div
              className="review-card__rating-fill"
              style={{ width: `${(review.rating_communication / 5) * 100}%` }}
            />
          </div>
          <span className="review-card__rating-value">{review.rating_communication}.0</span>
        </div>
        <div className="review-card__rating-item">
          <span className="review-card__rating-label">Location</span>
          <div className="review-card__rating-bar">
            <div
              className="review-card__rating-fill"
              style={{ width: `${(review.rating_location / 5) * 100}%` }}
            />
          </div>
          <span className="review-card__rating-value">{review.rating_location}.0</span>
        </div>
        <div className="review-card__rating-item">
          <span className="review-card__rating-label">Value</span>
          <div className="review-card__rating-bar">
            <div
              className="review-card__rating-fill"
              style={{ width: `${(review.rating_value / 5) * 100}%` }}
            />
          </div>
          <span className="review-card__rating-value">{review.rating_value}.0</span>
        </div>
      </div>

      {/* Review Text */}
      {review.review_text && (
        <p className="review-card__text">{review.review_text}</p>
      )}

      {/* Host Response */}
      {review.host_response && (
        <div className="review-card__response">
          <div className="review-card__response-header">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="review-card__response-label">Response from host</span>
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
          <p className="review-card__response-text">{review.host_response}</p>
        </div>
      )}
    </div>
  );
}

module.exports = ReviewCard;