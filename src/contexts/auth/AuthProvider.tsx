
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { RegistrationData } from './types';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSecureAuth();
  const navigate = useNavigate();
  const [hasError, setHasError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Registration state management
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
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
  }, []); // This is correct as an initialization effect
  
  // Update registration data in session storage when state changes
  const updateRegistrationData = (data: Partial<RegistrationData>) => {
    const updatedData = {
      ...(registrationData || {}),
      ...data,
      registrationTime: data.registrationTime || new Date().toISOString()
    };
    
    setRegistrationData(updatedData as RegistrationData);
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
    setIsRegistering(true);
  };
  
  // Clear registration data
  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    setRegistrationData(null);
    setIsRegistering(false);
    setPendingSubscription(false);
  };
  
  // Add error handling for auth initialization
  useEffect(() => {
    // Only create the timeout when still initializing
    if (!auth.initialized && isInitializing) {
      const timeoutId = setTimeout(() => {
        console.error('Auth initialization took too long, showing error page');
        setHasError(true);
      }, 10000); // 10 seconds timeout
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
    
    // When auth is initialized, update the initialization state
    if (auth.initialized) {
      setIsInitializing(false);
    }
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
    <AuthContext.Provider value={{
      ...auth,
      registrationData,
      isRegistering,
      pendingSubscription,
      setRegistrationData: updateRegistrationData,
      clearRegistrationData,
      setPendingSubscription
    }}>
      {children}
    </AuthContext.Provider>
  );
};
