
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/useSecureAuth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const auth = useSecureAuth();

  // Override auth methods to add navigation
  const enhancedSignIn = async (email: string, password: string) => {
    try {
      await auth.signIn(email, password);
      
      // Use setTimeout to prevent immediate navigation
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 300);
    } catch (error) {
      throw error;
    }
  };

  const enhancedSignOut = async () => {
    try {
      await auth.signOut();
      
      // Use a longer timeout for sign out to ensure all state is cleared
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 500);
    } catch (error) {
      throw error;
    }
  };

  // Show a global loader when auth is initializing to prevent flashes of content
  if (!auth.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      ...auth,
      signIn: enhancedSignIn,
      signOut: enhancedSignOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
