// frontend/components/listing/ImageGallery.jsx
// Image gallery with main display and thumbnail navigation
// Supports lightbox mode for full-screen image viewing

'use client';

const { useState } = require('react');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = { features: { ui: { imagePlaceholder: '/images/placeholder-listing.svg' } } };
}

/**
 * Image gallery component for listing detail pages.
 * Displays a main image with thumbnail strip for navigation.
 * Supports lightbox mode for full-screen viewing.
 *
 * @param {Object} props
 * @param {Array} props.images - Array of image objects { id, imageUrl, thumbnailUrl, altText }
 * @param {string} [props.alt='Listing image'] - Default alt text for images
 */
function ImageGallery({ images = [], alt = 'Listing image' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const placeholderImage = config.features?.ui?.imagePlaceholder || '/images/placeholder-listing.svg';

  // Use placeholder if no images provided
  const displayImages = images.length > 0
    ? images
    : [{ id: 'placeholder', imageUrl: placeholderImage, altText: alt }];

  /**
   * Navigates to the previous image in the gallery.
   */
  function handlePrevious() {
    setActiveIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  }

  /**
   * Navigates to the next image in the gallery.
   */
  function handleNext() {
    setActiveIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  }

  /**
   * Handles keyboard navigation in lightbox mode.
   *
   * @param {KeyboardEvent} e - Keyboard event
   */
  function handleKeyDown(e) {
    if (!isLightboxOpen) return;
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setIsLightboxOpen(false);
  }

  return (
    <>
      <div className="image-gallery">
        {/* Main Image */}
        <div className="image-gallery__main">
          <img
            src={displayImages[activeIndex]?.imageUrl || displayImages[activeIndex]?.url || placeholderImage}
            alt={displayImages[activeIndex]?.altText || alt}
            className="image-gallery__main-image"
            onClick={() => displayImages.length > 1 && setIsLightboxOpen(true)}
            onError={(e) => { e.target.src = placeholderImage; }}
          />

          {/* Navigation Arrows (only if multiple images) */}
          {displayImages.length > 1 && (
            <>
              <button
                className="image-gallery__arrow image-gallery__arrow--prev"
                onClick={handlePrevious}
                aria-label="Previous image"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className="image-gallery__arrow image-gallery__arrow--next"
                onClick={handleNext}
                aria-label="Next image"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Image Counter */}
              <span className="image-gallery__counter">
                {activeIndex + 1} / {displayImages.length}
              </span>
            </>
          )}

          {/* Fullscreen Button */}
          {displayImages.length > 1 && (
            <button
              className="image-gallery__fullscreen"
              onClick={() => setIsLightboxOpen(true)}
              aria-label="View fullscreen"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          )}
        </div>

        {/* Thumbnail Strip */}
        {displayImages.length > 1 && (
          <div className="image-gallery__thumbnails">
            {displayImages.map((image, index) => (
              <button
                key={image.id || index}
                className={`image-gallery__thumbnail ${index === activeIndex ? 'image-gallery__thumbnail--active' : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`View image ${index + 1}`}
              >
                <img
                  src={image.thumbnailUrl || image.imageUrl || image.url}
                  alt={image.altText || `${alt} ${index + 1}`}
                  loading="lazy"
                  onError={(e) => { e.target.src = placeholderImage; }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="image-gallery__lightbox"
          onClick={() => setIsLightboxOpen(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-label="Image lightbox"
        >
          <button
            className="image-gallery__lightbox-close"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <img
            src={displayImages[activeIndex]?.imageUrl || displayImages[activeIndex]?.url}
            alt={displayImages[activeIndex]?.altText || alt}
            className="image-gallery__lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />

          {displayImages.length > 1 && (
            <>
              <button
                className="image-gallery__lightbox-arrow image-gallery__lightbox-arrow--prev"
                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                aria-label="Previous image"
              >
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className="image-gallery__lightbox-arrow image-gallery__lightbox-arrow--next"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                aria-label="Next image"
              >
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

module.exports = ImageGallery;