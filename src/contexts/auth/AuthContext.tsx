
import React, { createContext, useContext } from 'react';
import { AuthContextType } from './types';

// Create context with a default value
const defaultValue: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  initialized: false,
  error: null,
  signIn: async () => { throw new Error('AuthContext not initialized') },
  signUp: async () => { throw new Error('AuthContext not initialized') },
  signOut: async () => { throw new Error('AuthContext not initialized') },
  updateProfile: async () => { throw new Error('AuthContext not initialized') },
  resetPassword: async () => { throw new Error('AuthContext not initialized') }
};

export const AuthContext = createContext<AuthContextType>(defaultValue);

// Export a custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
