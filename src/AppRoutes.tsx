
import React from 'react';
import App from './App';
import CardcomRedirectPage from './pages/CardcomRedirectPage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from './components/ui/tooltip';

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <Routes>
          <Route path="/cardcom-redirect" element={<CardcomRedirectPage />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
