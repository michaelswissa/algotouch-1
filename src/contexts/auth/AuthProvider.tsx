
import React from 'react';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/auth/useSecureAuth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSecureAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};
