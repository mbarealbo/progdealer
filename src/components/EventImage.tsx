import React, { useState } from 'react';
import { shouldUsePlaceholder, isValidImageUrl } from '../utils/imageUtils';

interface EventImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}

export default function EventImage({ 
  src, 
  alt, 
  className = "", 
  placeholderClassName = "" 
}: EventImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Determine if we should show placeholder
  const usePlaceholder = shouldUsePlaceholder(src) || imageError || !isValidImageUrl(src || '');

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // Custom placeholder component
  const PlaceholderImage = () => (
    <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-coal-700 to-coal-800 border border-asphalt-500 ${placeholderClassName}`}>
      <div className="text-4xl mb-2">🎸</div>
      <div className="text-center">
        <div className="text-white text-sm font-industrial font-bold uppercase tracking-wider leading-tight">
          PROGDEALER
        </div>
        <div className="text-gray-400 text-xs font-condensed uppercase tracking-wide mt-1">
          EVENT IMAGE
        </div>
      </div>
    </div>
  );

  if (usePlaceholder) {
    return <PlaceholderImage />;
  }

  return (
    <div className="relative">
      {imageLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-coal-800 ${placeholderClassName}`}>
          <div className="animate-pulse">
            <div className="text-2xl mb-1">🎸</div>
            <div className="text-gray-400 text-xs font-condensed uppercase tracking-wide">
              LOADING...
            </div>
          </div>
        </div>
      )}
      <img
        src={src!}
        alt={alt}
        className={className}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{ display: imageLoading ? 'none' : 'block' }}
      />
    </div>
  );
}