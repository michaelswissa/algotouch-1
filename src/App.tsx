
import React from 'react';
import { BrowserRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/auth';
import { StockDataProvider } from '@/contexts/stock/StockDataContext';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/contexts/theme';
import { generateRouteComponents } from '@/routing/routes';
import RoutePrefetcher from '@/components/RoutePrefetcher';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StockDataProvider>
          <Router>
            <RoutePrefetcher />
            <Routes>
              {generateRouteComponents()}
            </Routes>
          </Router>
          <Toaster />
        </StockDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
