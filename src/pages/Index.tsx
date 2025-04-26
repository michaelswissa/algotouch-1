
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';

// The index page redirects to the appropriate page based on auth status
const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  
  // Clear any stale registration data when landing on the index page
  useEffect(() => {
    // If there's stale registration data, clear it
    try {
      const registrationData = sessionStorage.getItem('registration_data');
      if (registrationData) {
        sessionStorage.removeItem('registration_data');
      }
    } catch (err) {
      console.error('Error checking registration data:', err);
    }
  }, []);
  
  if (loading) {
    return null;
  }
  
  // If user is authenticated, go to dashboard, otherwise to auth
  return isAuthenticated ? 
    <Navigate to="/dashboard" replace /> : 
    <Navigate to="/auth" replace />;
};

export default Index;
