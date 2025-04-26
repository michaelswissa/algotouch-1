
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

// The index page redirects to the auth page
const Index = () => {
  // Clear any stale registration data when landing on the index page
  useEffect(() => {
    // If there's stale registration data, clear it
    const registrationData = sessionStorage.getItem('registration_data');
    if (registrationData) {
      sessionStorage.removeItem('registration_data');
    }
  }, []);
  
  // Make sure the redirection works properly
  return <Navigate to="/auth" replace />;
};

export default Index;
