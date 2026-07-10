// frontend/components/ui/ImageUploader.jsx
// Drag-and-drop image uploader with preview, reordering, and primary image selection
// Integrates with the /api/upload endpoint for Cloudinary storage
// Author: Theron
'use client';

import { useState, useRef } from 'react';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Image Uploader Component
 * Allows users to select, preview, reorder, and designate a primary image.
 * Handles file validation and uploads to the backend.
 * 
 * @param {Object} props
 * @param {Array}  [props.existingImages=[]] - Array of existing image objects { id, image_url, is_primary }
 * @param {Function} [props.onImagesChange] - Callback when images are updated { images: Array, isDirty: boolean }
 * @param {string} [props.folder='listings'] - Cloudinary folder to upload to
 * @param {number} [props.maxImages=10] - Maximum number of images allowed
 */
export default function ImageUploader({ 
  existingImages = [], 
  onImagesChange, 
  folder = 'listings',
  maxImages = 10 
}) {
  const [images, setImages] = useState(existingImages.map(img => ({
    ...img,
    url: img.image_url || img.url,
    isNew: false,
  })));
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  /**
   * Validates and processes selected files.
   * @param {FileList} files - Files from input or drop event
   */
  async function handleFiles(files) {
    setError(null);
    const fileArray = Array.from(files);

    // Validate file count
    if (images.length + fileArray.length > maxImages) {
      setError(`You can only upload a maximum of ${maxImages} images.`);
      return;
    }

    // Validate file types and sizes
    const validFiles = fileArray.filter(file => {
      if (!constants.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only JPEG, PNG, and WebP are allowed.`);
        return false;
      }
      if (file.size > constants.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        setError(`File too large: ${file.name}. Maximum size is ${constants.MAX_IMAGE_SIZE_MB}MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      validFiles.forEach(file => formData.append('images', file));
      formData.append('folder', folder);

      const response = await apiClient.post('/upload', formData);
      const uploadedImages = response.data?.images || [];

      const newImages = uploadedImages.map(img => ({
        id: img.publicId || Date.now().toString(),
        url: img.url,
        is_primary: false,
        isNew: true,
      }));

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      
      // Ensure at least one image is primary
      if (!updatedImages.some(img => img.is_primary) && updatedImages.length > 0) {
        updatedImages[0].is_primary = true;
      }

      if (onImagesChange) {
        onImagesChange({ images: updatedImages, isDirty: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to upload images. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  }

  /**
   * Handles drag and drop events.
   */
  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  /**
   * Removes an image from the list.
   * @param {number} index - Index of the image to remove
   */
  function removeImage(index) {
    const updatedImages = images.filter((_, i) => i !== index);
    
    // If the removed image was primary, make the first remaining image primary
    if (images[index].is_primary && updatedImages.length > 0) {
      updatedImages[0].is_primary = true;
    }

    setImages(updatedImages);
    if (onImagesChange) {
      onImagesChange({ images: updatedImages, isDirty: true });
    }
  }

  /**
   * Sets an image as the primary (cover) image.
   * @param {number} index - Index of the image to set as primary
   */
  function setPrimaryImage(index) {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    setImages(updatedImages);
    if (onImagesChange) {
      onImagesChange({ images: updatedImages, isDirty: true });
    }
  }

  /**
   * Moves an image up or down in the list.
   * @param {number} index - Current index
   * @param {number} direction - -1 for up, 1 for down
   */
  function moveImage(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;

    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(index, 1);
    updatedImages.splice(newIndex, 0, movedImage);

    setImages(updatedImages);
    if (onImagesChange) {
      onImagesChange({ images: updatedImages, isDirty: true });
    }
  }

  return (
    <div className="image-uploader">
      {/* Drop Zone */}
      <div
        className={`image-uploader__drop-zone ${dragActive ? 'image-uploader__drop-zone--active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragActive ? 'var(--color-primary-light)' : 'var(--color-bg-secondary)',
          transition: 'all 150ms ease',
          marginBottom: '1.5rem',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={constants.ALLOWED_IMAGE_TYPES.join(',')}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          style={{ display: 'none' }}
          disabled={isUploading || images.length >= maxImages}
        />
        
        {isUploading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Uploading images...</p>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--color-text-light)" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.5rem' }}>
              Drag and drop images here, or click to browse
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
              {constants.ALLOWED_IMAGE_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')} up to {constants.MAX_IMAGE_SIZE_MB}MB each. Max {maxImages} images.
            </p>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--color-error-light)',
          color: 'var(--color-error)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {images.map((img, index) => (
            <div key={img.id || index} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: img.is_primary ? '3px solid var(--color-primary)' : '1px solid var(--color-border)' }}>
              <img src={img.url} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              
              {/* Primary Badge */}
              {img.is_primary && (
                <div style={{
                  position: 'absolute', top: '0.5rem', left: '0.5rem',
                  backgroundColor: 'var(--color-primary)', color: 'white',
                  padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)',
                }}>
                  Cover
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                position: 'absolute', bottom: '0', left: '0', right: '0',
                backgroundColor: 'rgba(0,0,0,0.7)', padding: '0.5rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', opacity: index === 0 ? 0.3 : 1 }}>
                    ↑
                  </button>
                  <button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', opacity: index === images.length - 1 ? 0.3 : 1 }}>
                    ↓
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {!img.is_primary && (
                    <button type="button" onClick={() => setPrimaryImage(index)} style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                      Set Cover
                    </button>
                  )}
                  <button type="button" onClick={() => removeImage(index)} style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}