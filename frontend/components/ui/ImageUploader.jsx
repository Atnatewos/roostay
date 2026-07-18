// frontend/components/ui/ImageUploader.jsx
// Professional multi-image uploader with drag-and-drop, reordering, and cover photo selection
// Supports multiple image uploads like Airbnb with grid preview and management controls
// Converts files to base64 and uploads via JSON to /api/upload endpoint
// Author: Theron
'use client';

import { useState, useRef, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import constants from '@/lib/constants';

/**
 * Professional Multi-Image Uploader Component
 * Provides Airbnb-style image management with:
 * - Drag-and-drop zone
 * - Multiple file selection
 * - Grid preview with hover controls
 * - Reordering (move up/down)
 * - Cover photo designation
 * - Individual deletion
 * - Upload progress indication
 * 
 * @param {Object}   props
 * @param {Array}    [props.images=[]]          - Current array of image objects { url, is_primary }
 * @param {Function} props.onImagesChange       - Callback when images array changes
 * @param {string}   [props.folder='listings']  - Cloudinary destination folder
 * @param {number}   [props.maxImages=10]       - Maximum number of images allowed
 */
export default function ImageUploader({ 
  images = [], 
  onImagesChange, 
  folder = 'listings',
  maxImages = 10 
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [hoveredImageIndex, setHoveredImageIndex] = useState(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  /**
   * Converts a File object to a base64 data URL string.
   * Returns a Promise that resolves with the base64 string.
   * 
   * @param {File} file - The file to convert
   * @returns {Promise<string>} Base64 encoded data URL
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Uploads a single base64 image to the server.
   * Returns the uploaded image URL on success.
   * 
   * @param {string} base64Image - Base64 encoded image data
   * @returns {Promise<string>} Uploaded image URL
   */
  async function uploadSingleImage(base64Image) {
    const response = await apiClient.post('/upload', {
      image: base64Image,
      folder: folder,
    });
    
    if (!response.data?.url) {
      throw new Error('Invalid upload response');
    }
    
    return response.data.url;
  }

  /**
   * Handles file selection and upload.
   * Validates files, converts to base64, uploads to server, and updates state.
   * Supports multiple file selection with progress tracking.
   * 
   * @param {FileList} files - Files from input or drop event
   */
  async function handleFiles(files) {
    const fileArray = Array.from(files);
    
    // Validate file count
    if (images.length + fileArray.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed. You can upload ${maxImages - images.length} more.`);
      return;
    }

    // Validate each file before uploading
    const validFiles = fileArray.filter(file => {
      if (!constants.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Only JPEG, PNG, WebP, and AVIF are allowed.`);
        return false;
      }
      if (file.size > constants.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Maximum size is ${constants.MAX_IMAGE_SIZE_MB}MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: validFiles.length });

    const newImages = [];
    
    try {
      // Upload files sequentially to show progress
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress({ current: i + 1, total: validFiles.length });
        
        // Convert to base64
        const base64Image = await fileToBase64(file);
        
        // Upload to server
        const imageUrl = await uploadSingleImage(base64Image);
        
        // Add to new images array
        newImages.push({
          url: imageUrl,
          is_primary: images.length === 0 && i === 0, // First image of first batch is cover
        });
      }

      // Update parent state with new images
      const updatedImages = [...images, ...newImages];
      
      // Ensure at least one image is marked as primary
      if (!updatedImages.some(img => img.is_primary) && updatedImages.length > 0) {
        updatedImages[0].is_primary = true;
      }
      
      onImagesChange(updatedImages);
      
      if (newImages.length > 1) {
        toast.success(`${newImages.length} images uploaded successfully!`);
      } else {
        toast.success('Image uploaded successfully!');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to upload images. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      // Clear file input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  /**
   * Handles drag enter/over events.
   * Sets drag active state for visual feedback.
   */
  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    }
  }

  /**
   * Handles drag leave event.
   * Clears drag active state.
   */
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  /**
   * Handles file drop event.
   * Extracts files from drop event and triggers upload.
   */
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  /**
   * Removes an image from the array by index.
   * Automatically promotes the next image to cover if the removed image was primary.
   * 
   * @param {number} index - Index of image to remove
   */
  function removeImage(index) {
    const updatedImages = images.filter((_, i) => i !== index);
    
    // If removed image was primary, make the first remaining image primary
    if (images[index].is_primary && updatedImages.length > 0) {
      updatedImages[0].is_primary = true;
    }
    
    onImagesChange(updatedImages);
    toast.info('Image removed');
  }

  /**
   * Sets an image as the primary (cover) photo.
   * Removes primary flag from all other images.
   * 
   * @param {number} index - Index of image to set as primary
   */
  function setAsPrimary(index) {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    onImagesChange(updatedImages);
    toast.success('Cover photo updated!');
  }

  /**
   * Moves an image up or down in the array.
   * Used for manual reordering of images.
   * 
   * @param {number} index     - Current index of image
   * @param {number} direction - -1 for up, 1 for down
   */
  function moveImage(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;
    
    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(index, 1);
    updatedImages.splice(newIndex, 0, movedImage);
    
    onImagesChange(updatedImages);
  }

  return (
    <div className="image-uploader">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          cursor: isUploading ? 'wait' : 'pointer',
          backgroundColor: dragActive ? 'var(--color-primary-light)' : 'var(--color-bg-secondary)',
          transition: 'all 200ms ease',
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
          <div>
            <div style={{ 
              fontSize: '2rem', 
              marginBottom: '1rem',
              animation: 'spin 1s linear infinite',
            }}>
              ⟳
            </div>
            <p style={{ 
              fontWeight: 'var(--font-weight-semibold)', 
              marginBottom: '0.5rem',
              color: 'var(--color-text-primary)',
            }}>
              Uploading {uploadProgress.current} of {uploadProgress.total}...
            </p>
            <div style={{
              width: '200px',
              height: '6px',
              backgroundColor: 'var(--color-border)',
              borderRadius: '3px',
              margin: '0 auto',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                height: '100%',
                backgroundColor: 'var(--color-primary)',
                transition: 'width 300ms ease',
              }} />
            </div>
          </div>
        ) : (
          <>
            <svg 
              viewBox="0 0 24 24" 
              width="48" 
              height="48" 
              fill="none" 
              stroke="var(--color-text-light)" 
              strokeWidth="1.5"
              style={{ marginBottom: '1rem' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ 
              fontWeight: 'var(--font-weight-semibold)', 
              marginBottom: '0.5rem',
              color: 'var(--color-text-primary)',
            }}>
              Drag and drop images here, or click to browse
            </p>
            <p style={{ 
              fontSize: 'var(--font-size-xs)', 
              color: 'var(--color-text-light)',
              marginBottom: '0.5rem',
            }}>
              {constants.ALLOWED_IMAGE_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')} up to {constants.MAX_IMAGE_SIZE_MB}MB each
            </p>
            <p style={{ 
              fontSize: 'var(--font-size-xs)', 
              color: 'var(--color-text-light)',
            }}>
              {images.length} of {maxImages} images uploaded
            </p>
          </>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1rem',
        }}>
          {images.map((img, index) => (
            <div
              key={img.url + index}
              onMouseEnter={() => setHoveredImageIndex(index)}
              onMouseLeave={() => setHoveredImageIndex(null)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: img.is_primary 
                  ? '3px solid var(--color-primary)' 
                  : '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              {/* Image Preview */}
              <img 
                src={img.url} 
                alt={`Property image ${index + 1}`}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  display: 'block',
                }} 
              />
              
              {/* Cover Photo Badge */}
              {img.is_primary && (
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  left: '0.5rem',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-bold)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  Cover
                </div>
              )}

              {/* Image Number Badge */}
              <div style={{
                position: 'absolute',
                bottom: '0.5rem',
                left: '0.5rem',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
              }}>
                {index + 1}
              </div>

              {/* Hover Controls Overlay */}
              {hoveredImageIndex === index && !isUploading && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  animation: 'fadeIn 150ms ease',
                }}>
                  {/* Set as Cover Button */}
                  {!img.is_primary && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAsPrimary(index);
                      }}
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-semibold)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      Set as Cover
                    </button>
                  )}

                  {/* Reorder Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveImage(index, -1);
                      }}
                      disabled={index === 0}
                      style={{
                        backgroundColor: 'white',
                        color: 'var(--color-text-primary)',
                        border: 'none',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        opacity: index === 0 ? 0.5 : 1,
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 150ms ease',
                      }}
                      title="Move left"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveImage(index, 1);
                      }}
                      disabled={index === images.length - 1}
                      style={{
                        backgroundColor: 'white',
                        color: 'var(--color-text-primary)',
                        border: 'none',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: index === images.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: index === images.length - 1 ? 0.5 : 1,
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 150ms ease',
                      }}
                      title="Move right"
                    >
                      →
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                    style={{
                      backgroundColor: 'var(--color-error)',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inline CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}