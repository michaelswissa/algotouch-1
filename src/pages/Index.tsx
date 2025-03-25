
import React from 'react';
import { Navigate } from 'react-router-dom';

// The index page simply redirects to the dashboard
const Index = () => {
  return <Navigate to="/dashboard" replace />;
};

export default Index;
