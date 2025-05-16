
import React from 'react';
import { Navigate } from 'react-router-dom';

// Redirects to Index page to maintain compatibility
const Home = () => {
  return <Navigate to="/" replace />;
};

export default Home;
