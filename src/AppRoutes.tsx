
import React from 'react';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

export default AppRoutes;
