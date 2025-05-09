
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
    
    // Prefetch logging only - actual module prefetching is disabled to prevent dynamic import issues
    setTimeout(() => {
      console.debug('Routes that would be prefetched:', 
        commonRoutes.filter(route => route !== location.pathname));
    }, 1000);
  }, [location]);
  
  return null;
};

export default RoutePrefetcher;
