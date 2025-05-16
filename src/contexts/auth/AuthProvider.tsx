
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { Spinner } from '@/components/ui/spinner';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSecureAuth();
  const navigate = useNavigate();
  const [hasError, setHasError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Add error handling for auth initialization
  useEffect(() => {
    // Set a timeout to detect if auth initialization takes too long
    const timeoutId = setTimeout(() => {
      if (!auth.initialized && isInitializing) {
        console.error('Auth initialization took too long, showing error page');
        setHasError(true);
      }
    }, 10000); // 10 seconds timeout
    
    // Clear timeout when auth is initialized
    if (auth.initialized) {
      clearTimeout(timeoutId);
      setIsInitializing(false);
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [auth.initialized, isInitializing]);
  
  // If there's an auth error, redirect to the error page
  useEffect(() => {
    if (hasError) {
      navigate('/auth-error', { replace: true });
    }
  }, [hasError, navigate]);
  
  // Show a global loader when auth is initializing to prevent flashes of content
  if (!auth.initialized && !hasError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }
  
  // If initialization is complete but there was an error
  if (hasError) {
    return null; // Will be redirected to error page via the useEffect
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};
