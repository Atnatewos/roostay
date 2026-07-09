// frontend/components/listing/ImageGallery.jsx
// Image gallery component with main view, thumbnails, and lightbox
// Uses Cloudinary transformations to serve appropriate image sizes
'use client';
import { useState } from 'react';
import { getThumbnailUrl, getHighResUrl } from '@/lib/cloudinary';

const PLACEHOLDER = '/images/placeholder-listing.svg';

export default function ImageGallery({ images = [], alt = 'Listing image' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const displayImages = images.length > 0 ? images : [{ id: 'placeholder', imageUrl: PLACEHOLDER, altText: alt }];

  function handlePrevious() { setActiveIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1)); }
  function handleNext() { setActiveIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1)); }

  const activeImageUrl = displayImages[activeIndex]?.imageUrl || displayImages[activeIndex]?.url || PLACEHOLDER;
  const mainImageUrl = getHighResUrl(activeImageUrl);

  return (
    <>
      <div className="image-gallery">
        <div className="image-gallery__main">
          <img src={mainImageUrl} alt={displayImages[activeIndex]?.altText || alt} className="image-gallery__main-image" onClick={() => displayImages.length > 1 && setIsLightboxOpen(true)} onError={(e) => { e.target.src = PLACEHOLDER; }} />
          {displayImages.length > 1 && (
            <>
              <button className="image-gallery__arrow image-gallery__arrow--prev" onClick={handlePrevious} aria-label="Previous">Prev</button>
              <button className="image-gallery__arrow image-gallery__arrow--next" onClick={handleNext} aria-label="Next">Next</button>
              <span className="image-gallery__counter">{activeIndex + 1} / {displayImages.length}</span>
            </>
          )}
        </div>
        {displayImages.length > 1 && (
          <div className="image-gallery__thumbnails">
            {displayImages.map((image, index) => {
              const thumbUrl = image.imageUrl || image.url;
              const optimizedThumb = getThumbnailUrl(thumbUrl);
              return (
                <button key={image.id || index} className={`image-gallery__thumbnail ${index === activeIndex ? 'image-gallery__thumbnail--active' : ''}`} onClick={() => setActiveIndex(index)}>
                  <img src={optimizedThumb} alt={image.altText || `${alt} ${index + 1}`} loading="lazy" onError={(e) => { e.target.src = PLACEHOLDER; }} />
                </button>
              );
            })}
          </div>
        )}
      </div>
      {isLightboxOpen && (
        <div className="image-gallery__lightbox" onClick={() => setIsLightboxOpen(false)}>
          <button className="image-gallery__lightbox-close" onClick={() => setIsLightboxOpen(false)}>X</button>
          <img src={mainImageUrl} alt={alt} className="image-gallery__lightbox-image" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}