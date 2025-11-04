import React, { useRef, useEffect, useState } from 'react';

export interface HiddenImageProps {
  src: string;
  alt: string;
  id?: string;
  className?: string;
  hideMethod?: 'visibility' | 'display' | 'opacity' | 'position' | 'clip' | 'transform' | 'aria-hidden';
  preserveSpace?: boolean;
  enableProgrammaticAccess?: boolean;
  metadata?: Record<string, any>;
  onLoad?: (element: HTMLImageElement) => void;
  onError?: (error: Event) => void;
}

export interface HiddenImageRef {
  getElement: () => HTMLImageElement | null;
  getMetadata: () => Record<string, any> | undefined;
  isLoaded: () => boolean;
  getDimensions: () => { width: number; height: number } | null;
  getImageData: () => Promise<ImageData | null>;
}

/**
 * HiddenImage Component
 * 
 * Renders an image that is completely hidden from the user interface
 * while maintaining accessibility to the system for backend processing,
 * data analysis, or programmatic access.
 * 
 * Features:
 * - Multiple hiding methods (CSS-based)
 * - Preserves DOM structure and metadata
 * - Maintains accessibility for screen readers when needed
 * - Responsive design compatible
 * - Programmatic access to image data
 * - No layout interference
 */
const HiddenImage = React.forwardRef<HiddenImageRef, HiddenImageProps>(({
  src,
  alt,
  id,
  className = '',
  hideMethod = 'visibility',
  preserveSpace = false,
  enableProgrammaticAccess = true,
  metadata,
  onLoad,
  onError
}, ref) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // CSS styles for different hiding methods
  const getHidingStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      // Ensure no layout interference
      maxWidth: preserveSpace ? undefined : '0',
      maxHeight: preserveSpace ? undefined : '0',
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      margin: preserveSpace ? undefined : '0',
      padding: '0',
    };

    switch (hideMethod) {
      case 'visibility':
        return {
          ...baseStyles,
          visibility: 'hidden',
          position: preserveSpace ? 'static' : 'absolute',
          width: preserveSpace ? 'auto' : '1px',
          height: preserveSpace ? 'auto' : '1px',
          overflow: 'hidden',
        };

      case 'display':
        return {
          ...baseStyles,
          display: 'none',
        };

      case 'opacity':
        return {
          ...baseStyles,
          opacity: 0,
          position: preserveSpace ? 'static' : 'absolute',
          width: preserveSpace ? 'auto' : '1px',
          height: preserveSpace ? 'auto' : '1px',
          pointerEvents: 'none',
        };

      case 'position':
        return {
          ...baseStyles,
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        };

      case 'clip':
        return {
          ...baseStyles,
          position: 'absolute',
          clip: 'rect(0, 0, 0, 0)',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        };

      case 'transform':
        return {
          ...baseStyles,
          transform: 'scale(0)',
          position: preserveSpace ? 'static' : 'absolute',
          width: preserveSpace ? 'auto' : '1px',
          height: preserveSpace ? 'auto' : '1px',
          transformOrigin: 'top left',
        };

      case 'aria-hidden':
        return {
          ...baseStyles,
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
        };

      default:
        return baseStyles;
    }
  };

  // Handle image load
  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setIsLoaded(true);
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    
    if (onLoad) {
      onLoad(img);
    }
  };

  // Handle image error
  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(false);
    if (onError) {
      onError(event.nativeEvent);
    }
  };

  // Expose methods through ref
  React.useImperativeHandle(ref, () => ({
    getElement: () => imageRef.current,
    getMetadata: () => metadata,
    isLoaded: () => isLoaded,
    getDimensions: () => imageDimensions,
    getImageData: async () => {
      if (!imageRef.current || !isLoaded) return null;
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        canvas.width = imageDimensions?.width || imageRef.current.naturalWidth;
        canvas.height = imageDimensions?.height || imageRef.current.naturalHeight;
        
        ctx.drawImage(imageRef.current, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (error) {
        console.error('Error getting image data:', error);
        return null;
      }
    },
  }));

  // Store metadata in data attributes for system access
  const dataAttributes = metadata ? Object.keys(metadata).reduce((acc, key) => {
    acc[`data-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`] = String(metadata[key]);
    return acc;
  }, {} as Record<string, string>) : {};

  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      id={id}
      className={`hidden-image ${className}`.trim()}
      style={getHidingStyles()}
      onLoad={handleLoad}
      onError={handleError}
      aria-hidden={hideMethod === 'aria-hidden' ? 'true' : undefined}
      tabIndex={-1}
      draggable={false}
      {...dataAttributes}
      // Additional attributes for system identification
      data-hidden-image="true"
      data-hide-method={hideMethod}
      data-preserve-space={preserveSpace.toString()}
      data-programmatic-access={enableProgrammaticAccess.toString()}
    />
  );
});

HiddenImage.displayName = 'HiddenImage';

export default HiddenImage;