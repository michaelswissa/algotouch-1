
import React from 'react';
import { Navigate } from 'react-router-dom';

// The index page redirects to the auth page
const Index = () => {
  // Make sure the redirection works properly
  return <Navigate to="/auth" replace />;
};

export default Index;
