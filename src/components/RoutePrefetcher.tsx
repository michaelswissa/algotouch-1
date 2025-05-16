
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// This component helps with route transitions and prefetching
const RoutePrefetcher = () => {
  const location = useLocation();

  useEffect(() => {
    // Log navigation for debugging
    console.log('Route changed to:', location.pathname);
    
    // We could add more prefetching logic here if needed
    // For example, prefetching data for specific routes
  }, [location]);

  return null; // This component doesn't render anything
};

export default RoutePrefetcher;
