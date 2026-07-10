// frontend/hooks/useBreadcrumb.js
// Custom hook for generating breadcrumb items from URL path
// Supports automatic generation and custom label overrides
'use client';

import { usePathname } from 'next/navigation';
import breadcrumbConfig, { dynamicLabels } from '@/lib/breadcrumbConfig';

/**
 * useBreadcrumb Hook
 * Generates breadcrumb items based on the current URL path.
 * Supports custom labels via the data parameter.
 * 
 * @param {Object} [data] - Optional data for dynamic segments
 * @returns {Array<Object>} Array of breadcrumb items
 * 
 * @example
 * // Auto-generate from URL
 * const breadcrumbs = useBreadcrumb();
 * 
 * @example
 * // Override dynamic segment labels
 * const breadcrumbs = useBreadcrumb({ title: 'Modern Apartment in Bole' });
 * // Result: [
 * //   { label: 'Home', href: '/' },
 * //   { label: 'Listings', href: '/listings' },
 * //   { label: 'Modern Apartment in Bole', href: '/listings/abc123' }
 * // ]
 */
export default function useBreadcrumb(data = {}) {
  const pathname = usePathname();
  
  // Split pathname into segments
  const segments = pathname.split('/').filter(Boolean);
  
  // Build breadcrumb items
  const breadcrumbs = [{ label: 'Home', href: '/' }];
  
  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Check if this is a dynamic segment (UUID format)
    const isDynamic = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
    
    if (isDynamic) {
      // Check for custom label function
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      const dynamicKey = `${parentPath}/[id]`;
      
      if (dynamicLabels[dynamicKey]) {
        const label = dynamicLabels[dynamicKey](segment, data);
        breadcrumbs.push({
          label,
          href: currentPath,
          isLast: i === segments.length - 1,
        });
      } else {
        // Default label for dynamic segments
        breadcrumbs.push({
          label: 'Details',
          href: currentPath,
          isLast: i === segments.length - 1,
        });
      }
    } else {
      // Static segment - check config
      const config = breadcrumbConfig[currentPath];
      
      if (config) {
        breadcrumbs.push({
          label: config.label,
          href: currentPath,
          isLast: i === segments.length - 1,
        });
      } else {
        // Fallback: capitalize segment
        const label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        breadcrumbs.push({
          label,
          href: currentPath,
          isLast: i === segments.length - 1,
        });
      }
    }
  }
  
  return breadcrumbs;
}