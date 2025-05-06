
/**
 * Image optimization utilities
 */

/**
 * Get the WebP version of an image if available
 * @param imagePath Original image path
 * @returns Path to WebP version or original if WebP not available
 */
export const getWebPVersion = (imagePath: string): string => {
  // Check if the image already has a file extension
  const hasExtension = /\.(jpe?g|png|gif|svg)$/i.test(imagePath);
  
  // Only convert if it has a recognized extension
  if (hasExtension) {
    // Replace the extension with .webp
    return imagePath.replace(/\.(jpe?g|png|gif)$/i, '.webp');
  }
  
  return imagePath;
};

/**
 * Get responsive image sizes for different viewport widths
 * @param baseWidth The base width of the image in pixels
 * @returns Sizes attribute string for responsive images
 */
export const getResponsiveSizes = (baseWidth: number): string => {
  return `(max-width: 640px) ${Math.min(baseWidth, 640)}px, 
          (max-width: 768px) ${Math.min(baseWidth, 768)}px, 
          (max-width: 1024px) ${Math.min(baseWidth, 1024)}px, 
          ${baseWidth}px`;
};

/**
 * Check if the browser supports the WebP format
 * @returns Promise resolving to true if WebP is supported
 */
export const supportsWebP = async (): Promise<boolean> => {
  // Use feature detection
  if (!window.createImageBitmap) return false;
  
  // Create a test WebP image
  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  const blob = await fetch(webpData).then(r => r.blob());
  
  return createImageBitmap(blob).then(() => true, () => false);
};

/**
 * Preload critical images
 * @param imagePaths Array of critical image paths to preload
 */
export const preloadCriticalImages = (imagePaths: string[]): void => {
  imagePaths.forEach(path => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = path;
    document.head.appendChild(link);
  });
};
