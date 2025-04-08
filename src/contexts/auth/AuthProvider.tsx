
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/useSecureAuth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSecureAuth();
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);

  // Initialize auth and set up navigation effects after router is available
  useEffect(() => {
    if (!auth.initialized) return;
    
    setInitialized(true);
  }, [auth.initialized, location]);

  // Use a conditional to avoid rendering the child components until auth is initialized
  if (!initialized && !auth.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};
