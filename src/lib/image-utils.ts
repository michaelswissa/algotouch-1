
/**
 * Utility functions for image optimization
 */

/**
 * Get the appropriate image size based on the viewport width
 * @param baseWidth Base width of the image
 * @returns Optimized width based on viewport
 */
export function getResponsiveImageWidth(baseWidth: number): number {
  if (typeof window === 'undefined') return baseWidth;
  
  const viewportWidth = window.innerWidth;
  
  // Scale down for smaller screens
  if (viewportWidth < 640) {
    return Math.min(baseWidth, viewportWidth - 32); // Subtract padding
  }
  
  // Scale for medium screens
  if (viewportWidth < 1024) {
    return Math.min(baseWidth, (viewportWidth * 0.8));
  }
  
  // For larger screens, use original or cap at reasonable size
  return Math.min(baseWidth, 1200);
}

/**
 * Build a responsive image srcset
 * @param basePath Base path of the image
 * @param extension Image extension
 * @returns Srcset string for responsive images
 */
export function buildSrcSet(basePath: string, extension: string = 'jpg'): string {
  const sizes = [320, 640, 768, 1024, 1280];
  
  return sizes
    .map(size => `${basePath}-${size}.${extension} ${size}w`)
    .join(', ');
}

/**
 * Calculate the aspect ratio placeholder padding percentage
 * @param width Image width
 * @param height Image height
 * @returns Padding bottom percentage
 */
export function calculateAspectRatioPadding(width: number, height: number): string {
  return `${(height / width) * 100}%`;
}

/**
 * Determine if an image should be preloaded
 * @param importance Image importance ('high', 'medium', 'low')
 * @param isAboveFold Whether image appears above the fold
 * @returns Whether to preload the image
 */
export function shouldPreloadImage(importance: 'high' | 'medium' | 'low', isAboveFold: boolean): boolean {
  if (importance === 'high' && isAboveFold) return true;
  return false;
}
