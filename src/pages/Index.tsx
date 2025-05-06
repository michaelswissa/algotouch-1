
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthStorageService } from '@/services/storage/AuthStorageService';

// The index page redirects to the auth page
const Index = () => {
  // Clear any stale registration data when landing on the index page
  useEffect(() => {
    // Clear stale registration data
    AuthStorageService.clearRegistrationData();
  }, []);
  
  // Redirect to auth page
  return <Navigate to="/auth" replace />;
};

export default Index;
