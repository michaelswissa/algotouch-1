
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/auth';
import { StockDataProvider } from '@/contexts/stock/StockDataContext';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/contexts/theme';
// Pages
import Dashboard from '@/pages/Dashboard';
import CourseDetail from '@/pages/CourseDetail';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';
import Index from '@/pages/Index';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StockDataProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
