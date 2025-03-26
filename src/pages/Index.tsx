
import React from 'react';
import { Navigate } from 'react-router-dom';

// The index page redirects to the dashboard
const Index = () => {
  // Make sure the redirection works properly
  return <Navigate to="/dashboard" replace />;
};

export default Index;
