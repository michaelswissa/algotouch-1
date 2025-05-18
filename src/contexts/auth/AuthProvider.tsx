
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { RegistrationData as AuthRegistrationData } from './types';
import { supabase } from '@/lib/supabase-client';
import { AuthError } from '@supabase/supabase-js';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSecureAuth();
  const navigate = useNavigate();
  const [hasError, setHasError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Registration state management
  const [registrationData, setRegistrationData] = useState<AuthRegistrationData | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(false);
  
  // Load registration data from session storage on mount
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        const data = JSON.parse(storedData);
        
        // Check if data is still valid (within 30 minutes)
        const registrationTime = data.registrationTime ? new Date(data.registrationTime) : null;
        const now = new Date();
        const isValid = registrationTime && 
          ((now.getTime() - registrationTime.getTime()) < 30 * 60 * 1000);
        
        if (isValid) {
          setRegistrationData({ ...data, isValid });
          setIsRegistering(true);
          setPendingSubscription(true);
        } else {
          // Clear stale registration data
          sessionStorage.removeItem('registration_data');
        }
      }
    } catch (error) {
      console.error("Error parsing registration data:", error);
      sessionStorage.removeItem('registration_data');
    }
  }, []);
  
  // Update registration data in session storage when state changes
  const updateRegistrationData = (data: Partial<AuthRegistrationData>) => {
    const updatedData = {
      ...(registrationData || {}),
      ...data,
      registrationTime: data.registrationTime || new Date().toISOString()
    };
    
    setRegistrationData(updatedData as AuthRegistrationData);
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
    setIsRegistering(true);
  };
  
  // Clear registration data
  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    localStorage.removeItem('temp_registration_id');
    setRegistrationData(null);
    setIsRegistering(false);
    setPendingSubscription(false);
  };
  
  // Validate session with the server
  const validateSession = async () => {
    if (!auth.session) return false;
    
    try {
      // Use the imported supabase client directly
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Session validation error:', error);
        return false;
      }
      
      return !!data.user;
    } catch (error) {
      console.error('Session validation exception:', error);
      return false;
    }
  };
  
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

  // Create a compatible error object if auth.error is not already an AuthError
  let authError: AuthError | null = null;
  if (auth.error) {
    if ('code' in auth.error && 'status' in auth.error && '__isAuthError' in auth.error) {
      // It's already an AuthError
      authError = auth.error as AuthError;
    } else {
      // Create an AuthError-compatible object
      authError = {
        name: auth.error.name || 'AuthError',
        message: auth.error.message || 'Authentication error',
        code: 'unknown_error',
        status: 500,
        __isAuthError: true
      } as AuthError;
    }
  }

  return (
    <AuthContext.Provider value={{
      ...auth,
      error: authError,
      registrationData,
      isRegistering,
      pendingSubscription,
      setRegistrationData: updateRegistrationData,
      clearRegistrationData,
      setPendingSubscription,
      validateSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};
