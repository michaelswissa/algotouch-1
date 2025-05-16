
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/auth';
import { StockDataProvider } from '@/contexts/stock/StockDataContext';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/contexts/theme';
// Pages
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import CourseDetail from '@/pages/CourseDetail';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <StockDataProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/courses/:courseId" element={<CourseDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </StockDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
