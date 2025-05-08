
import React from 'react';
import App from './App';
import CardcomRedirectPage from './pages/CardcomRedirectPage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cardcom-redirect" element={<CardcomRedirectPage />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
