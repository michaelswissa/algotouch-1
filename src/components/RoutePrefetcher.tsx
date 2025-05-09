
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// List of common routes to prefetch
const commonRoutes = [
  '/dashboard',
  '/community',
  '/courses',
  '/trade-journal',
  '/calendar',
  '/profile',
  '/my-subscription'
];

const RoutePrefetcher: React.FC = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Only prefetch after initial load is complete
    if (location.pathname === '/') return;
    
    // Wait until idle to prefetch with a small delay
    setTimeout(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => prefetchRoutes());
      } else {
        // Fallback for browsers that don't support requestIdleCallback
        setTimeout(() => prefetchRoutes(), 200);
      }
    }, 300);
  }, [location]);
  
  const prefetchRoutes = () => {
    // Get routes that aren't the current route
    const routesToPrefetch = commonRoutes.filter(route => route !== location.pathname);
    
    // Log prefetching activity for debugging
    console.log('Prefetching routes:', routesToPrefetch);
    
    // We're not actually prefetching modules anymore as that was causing issues
    // Instead we'll just log that we would prefetch these routes
    routesToPrefetch.forEach(route => {
      console.debug(`Would prefetch route: ${route}`);
    });
  };
  
  return null;
};

export default RoutePrefetcher;
