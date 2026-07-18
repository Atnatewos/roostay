'use client';

import { useState } from 'react';

const PLACEHOLDER = '/images/placeholder-listing.svg';

export default function ImageGallery({ images = [], alt = 'Listing image' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const displayImages = images.length > 0
    ? images.map((img) => ({
        ...img,
        url: img.url || img.imageUrl || img.image_url || PLACEHOLDER,
        altText: img.altText || img.alt_text || alt,
      }))
    : [{ id: 'placeholder', url: PLACEHOLDER, altText: alt }];

  const activeImageUrl = displayImages[activeIndex]?.url || PLACEHOLDER;

  function handlePrevious() { 
    setActiveIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1)); 
  }
  
  function handleNext() { 
    setActiveIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1)); 
  }

  return (
    <>
      <div className="image-gallery">
        <div className="image-gallery__main">
          <img 
            src={activeImageUrl}
            alt={displayImages[activeIndex]?.altText || alt} 
            className="image-gallery__main-image" 
            onClick={() => displayImages.length > 1 && setIsLightboxOpen(true)} 
            onError={(e) => { 
              if (e.target.src !== PLACEHOLDER) {
                e.target.src = PLACEHOLDER;
              }
            }} 
          />
          
          {displayImages.length > 1 && (
            <>
              <button className="image-gallery__arrow image-gallery__arrow--prev" onClick={handlePrevious} aria-label="Previous">
                Prev
              </button>
              <button className="image-gallery__arrow image-gallery__arrow--next" onClick={handleNext} aria-label="Next">
                Next
              </button>
              <span className="image-gallery__counter">
                {activeIndex + 1} / {displayImages.length}
              </span>
            </>
          )}
        </div>

        {displayImages.length > 1 && (
          <div className="image-gallery__thumbnails">
            {displayImages.map((image, index) => {
              const thumbUrl = image.url || image.imageUrl || image.image_url || PLACEHOLDER;
              return (
                <button 
                  key={image.id || index} 
                  className={`image-gallery__thumbnail ${index === activeIndex ? 'image-gallery__thumbnail--active' : ''}`} 
                  onClick={() => setActiveIndex(index)}
                >
                  <img 
                    src={thumbUrl}
                    alt={image.altText || `${alt} ${index + 1}`} 
                    loading="lazy" 
                    onError={(e) => { 
                      if (e.target.src !== PLACEHOLDER) {
                        e.target.src = PLACEHOLDER;
                      }
                    }} 
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isLightboxOpen && (
        <div className="image-gallery__lightbox" onClick={() => setIsLightboxOpen(false)}>
          <button className="image-gallery__lightbox-close" onClick={() => setIsLightboxOpen(false)}>
            X
          </button>
          <img 
            src={activeImageUrl}
            alt={alt} 
            className="image-gallery__lightbox-image" 
            onClick={(e) => e.stopPropagation()} 
            onError={(e) => { 
              if (e.target.src !== PLACEHOLDER) {
                e.target.src = PLACEHOLDER;
              }
            }} 
          />
        </div>
      )}
    </>
  );
}
