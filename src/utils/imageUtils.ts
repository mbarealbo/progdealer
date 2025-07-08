// Utility functions for handling event images and placeholders

export const DEFAULT_CONCERTFUL_IMAGE = "https://concertful.com/public/foto/large/default.jpg";

/**
 * Checks if an image URL should be replaced with a placeholder
 */
export function shouldUsePlaceholder(imageUrl?: string | null): boolean {
  if (!imageUrl || imageUrl.trim() === '') {
    return true;
  }
  
  // Check for the specific Concertful default image
  if (imageUrl === DEFAULT_CONCERTFUL_IMAGE) {
    return true;
  }
  
  return false;
}

/**
 * Validates if an image URL is potentially valid
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Component for rendering event images with fallback to custom placeholder
 */
export interface EventImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  onError?: () => void;
}