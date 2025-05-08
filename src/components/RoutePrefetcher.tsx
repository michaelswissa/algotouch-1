
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
    // Don't prefetch on initial load to avoid slowing down first render
    if (location.key === 'default') return;
    
    // Wait until idle to prefetch
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => prefetchRoutes());
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(() => prefetchRoutes(), 1000);
    }
  }, [location]);
  
  const prefetchRoutes = () => {
    // Get routes that aren't the current route
    const routesToPrefetch = commonRoutes.filter(route => route !== location.pathname);
    
    // Prefetch the modules for these routes
    routesToPrefetch.forEach(route => {
      // Using it directly from the modules in App.tsx
      try {
        const moduleName = route === '/' ? 'Index' 
          : route.substring(1).charAt(0).toUpperCase() + route.substring(2);
        
        // Dynamic import to trigger preload
        import(`../pages/${moduleName}.tsx`).catch(() => {
          // Ignore errors - this is just prefetching
        });
      } catch (e) {
        // Ignore errors in prefetch
      }
    });
  };
  
  return null;
};

export default RoutePrefetcher;
