/**
 * Hidden Image Utilities
 * 
 * Provides utility functions for programmatic access to hidden images,
 * metadata extraction, and system-level operations while maintaining
 * complete visual concealment from users.
 */

export interface HiddenImageData {
  element: HTMLImageElement;
  metadata?: Record<string, any>;
  dimensions: { width: number; height: number };
  isLoaded: boolean;
  hideMethod: string;
  preserveSpace: boolean;
}

export interface ImageAnalysisResult {
  src: string;
  alt: string;
  metadata: Record<string, any>;
  dimensions: { width: number; height: number };
  fileSize?: number;
  format?: string;
  colorProfile?: string;
  hasTransparency?: boolean;
}

/**
 * Find all hidden images in the DOM
 */
export const findAllHiddenImages = (): HTMLImageElement[] => {
  return Array.from(document.querySelectorAll('img[data-hidden-image="true"]'));
};

/**
 * Find hidden image by ID
 */
export const findHiddenImageById = (id: string): HTMLImageElement | null => {
  return document.querySelector(`img[data-hidden-image="true"]#${id}`);
};

/**
 * Find hidden images by metadata attribute
 */
export const findHiddenImagesByMetadata = (key: string, value?: string): HTMLImageElement[] => {
  const selector = value 
    ? `img[data-hidden-image="true"][data-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}="${value}"]`
    : `img[data-hidden-image="true"][data-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}]`;
  
  return Array.from(document.querySelectorAll(selector));
};

/**
 * Extract metadata from hidden image element
 */
export const extractMetadata = (element: HTMLImageElement): Record<string, any> => {
  const metadata: Record<string, any> = {};
  
  // Extract all data attributes
  Array.from(element.attributes).forEach(attr => {
    if (attr.name.startsWith('data-') && !attr.name.startsWith('data-hidden-') && !attr.name.startsWith('data-hide-') && !attr.name.startsWith('data-preserve-') && !attr.name.startsWith('data-programmatic-')) {
      const key = attr.name.replace('data-', '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      metadata[key] = attr.value;
    }
  });
  
  return metadata;
};

/**
 * Get comprehensive data about a hidden image
 */
export const getHiddenImageData = (element: HTMLImageElement): HiddenImageData | null => {
  if (!element.hasAttribute('data-hidden-image')) {
    return null;
  }
  
  return {
    element,
    metadata: extractMetadata(element),
    dimensions: {
      width: element.naturalWidth,
      height: element.naturalHeight,
    },
    isLoaded: element.complete && element.naturalHeight !== 0,
    hideMethod: element.getAttribute('data-hide-method') || 'visibility',
    preserveSpace: element.getAttribute('data-preserve-space') === 'true',
  };
};

/**
 * Convert image to base64 data URL for backend processing
 */
export const imageToBase64 = async (element: HTMLImageElement): Promise<string | null> => {
  if (!element.complete || element.naturalHeight === 0) {
    return null;
  }
  
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    canvas.width = element.naturalWidth;
    canvas.height = element.naturalHeight;
    
    ctx.drawImage(element, 0, 0);
    return canvas.toDataURL();
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};

/**
 * Extract image data for analysis
 */
export const getImageAnalysisData = async (element: HTMLImageElement): Promise<ImageAnalysisResult | null> => {
  const hiddenImageData = getHiddenImageData(element);
  if (!hiddenImageData || !hiddenImageData.isLoaded) {
    return null;
  }
  
  try {
    const base64 = await imageToBase64(element);
    const format = getImageFormat(element.src);
    
    return {
      src: element.src,
      alt: element.alt,
      metadata: hiddenImageData.metadata || {},
      dimensions: hiddenImageData.dimensions,
      format,
      hasTransparency: await checkImageTransparency(element),
    };
  } catch (error) {
    console.error('Error analyzing image:', error);
    return null;
  }
};

/**
 * Get image format from URL or data URL
 */
export const getImageFormat = (src: string): string | undefined => {
  if (src.startsWith('data:image/')) {
    const match = src.match(/data:image\/([^;]+)/);
    return match ? match[1] : undefined;
  }
  
  const extension = src.split('.').pop()?.toLowerCase();
  return extension;
};

/**
 * Check if image has transparency
 */
export const checkImageTransparency = async (element: HTMLImageElement): Promise<boolean> => {
  if (!element.complete || element.naturalHeight === 0) {
    return false;
  }
  
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    canvas.width = element.naturalWidth;
    canvas.height = element.naturalHeight;
    
    ctx.drawImage(element, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check alpha channel (every 4th value)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking transparency:', error);
    return false;
  }
};

/**
 * Create a hidden image programmatically
 */
export const createHiddenImage = (
  src: string,
  options: {
    alt?: string;
    id?: string;
    hideMethod?: 'visibility' | 'display' | 'opacity' | 'position' | 'clip' | 'transform' | 'aria-hidden';
    metadata?: Record<string, any>;
    onLoad?: (element: HTMLImageElement) => void;
    onError?: (error: Event) => void;
  } = {}
): HTMLImageElement => {
  const img = document.createElement('img');
  
  img.src = src;
  img.alt = options.alt || '';
  if (options.id) img.id = options.id;
  
  // Set hidden image attributes
  img.setAttribute('data-hidden-image', 'true');
  img.setAttribute('data-hide-method', options.hideMethod || 'visibility');
  img.setAttribute('data-preserve-space', 'false');
  img.setAttribute('data-programmatic-access', 'true');
  
  // Add metadata as data attributes
  if (options.metadata) {
    Object.entries(options.metadata).forEach(([key, value]) => {
      img.setAttribute(`data-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, String(value));
    });
  }
  
  // Apply hiding styles
  applyHidingStyles(img, options.hideMethod || 'visibility');
  
  // Add event listeners
  if (options.onLoad) {
    img.addEventListener('load', () => options.onLoad!(img));
  }
  if (options.onError) {
    img.addEventListener('error', options.onError);
  }
  
  return img;
};

/**
 * Apply hiding styles to an image element
 */
export const applyHidingStyles = (
  element: HTMLImageElement, 
  hideMethod: 'visibility' | 'display' | 'opacity' | 'position' | 'clip' | 'transform' | 'aria-hidden' = 'visibility'
): void => {
  // Reset styles
  element.style.cssText = '';
  
  // Base styles for no layout interference
  const baseStyles = {
    maxWidth: '0',
    maxHeight: '0',
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    margin: '0',
    padding: '0',
  };
  
  Object.assign(element.style, baseStyles);
  
  switch (hideMethod) {
    case 'visibility':
      Object.assign(element.style, {
        visibility: 'hidden',
        position: 'absolute',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      });
      break;
      
    case 'display':
      element.style.display = 'none';
      break;
      
    case 'opacity':
      Object.assign(element.style, {
        opacity: '0',
        position: 'absolute',
        width: '1px',
        height: '1px',
        pointerEvents: 'none',
      });
      break;
      
    case 'position':
      Object.assign(element.style, {
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      });
      break;
      
    case 'clip':
      Object.assign(element.style, {
        position: 'absolute',
        clip: 'rect(0, 0, 0, 0)',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      });
      break;
      
    case 'transform':
      Object.assign(element.style, {
        transform: 'scale(0)',
        position: 'absolute',
        width: '1px',
        height: '1px',
        transformOrigin: 'top left',
      });
      break;
      
    case 'aria-hidden':
      Object.assign(element.style, {
        position: 'absolute',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
      });
      element.setAttribute('aria-hidden', 'true');
      break;
  }
  
  // Ensure no interaction
  element.tabIndex = -1;
  element.draggable = false;
};

/**
 * Batch process multiple hidden images
 */
export const batchProcessHiddenImages = async <T>(
  processor: (element: HTMLImageElement, data: HiddenImageData) => Promise<T> | T,
  filter?: (data: HiddenImageData) => boolean
): Promise<T[]> => {
  const hiddenImages = findAllHiddenImages();
  const results: T[] = [];
  
  for (const element of hiddenImages) {
    const data = getHiddenImageData(element);
    if (!data) continue;
    
    if (filter && !filter(data)) continue;
    
    try {
      const result = await processor(element, data);
      results.push(result);
    } catch (error) {
      console.error('Error processing hidden image:', error);
    }
  }
  
  return results;
};

/**
 * Monitor hidden images for changes
 */
export const monitorHiddenImages = (
  callback: (changes: { added: HTMLImageElement[]; removed: HTMLImageElement[]; modified: HTMLImageElement[] }) => void,
  options: { checkInterval?: number } = {}
): () => void => {
  const { checkInterval = 1000 } = options;
  let previousImages = new Set(findAllHiddenImages());
  
  const interval = setInterval(() => {
    const currentImages = new Set(findAllHiddenImages());
    
    const added = Array.from(currentImages).filter(img => !previousImages.has(img));
    const removed = Array.from(previousImages).filter(img => !currentImages.has(img));
    const modified: HTMLImageElement[] = []; // Could be enhanced to detect attribute changes
    
    if (added.length > 0 || removed.length > 0 || modified.length > 0) {
      callback({ added, removed, modified });
    }
    
    previousImages = currentImages;
  }, checkInterval);
  
  return () => clearInterval(interval);
};