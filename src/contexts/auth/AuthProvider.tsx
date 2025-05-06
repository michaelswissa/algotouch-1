
import React from 'react';
import { AuthContext } from './AuthContext';
import { useAuthState } from './useAuthState';
import { useAuthActions } from './useAuthActions';
import { Spinner } from '@/components/ui/spinner';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authState = useAuthState();
  const authActions = useAuthActions();
  
  const value = {
    ...authState,
    ...authActions,
  };

  // Show a global loader when auth is initializing to prevent flashes of content
  if (!authState.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
