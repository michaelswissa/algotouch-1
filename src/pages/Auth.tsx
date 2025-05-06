
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';
import AuthWrapper from '@/components/auth/AuthWrapper';
import AuthContent from '@/components/auth/AuthContent';
import { useAuthRedirect, useRegistrationCheck } from '@/hooks/auth/useAuthRedirect';

const Auth = () => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  
  // Handle redirection for authenticated users
  useAuthRedirect(isAuthenticated);
  
  // Check registration data
  useRegistrationCheck();

  // Performance mark for timing component load
  useEffect(() => {
    if (typeof performance !== 'undefined') {
      performance.mark('auth-page-rendered');
    }
  }, []);

  // Show loading state while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/90 p-4">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <AuthWrapper>
      <AuthContent redirectTo={redirectTo} />
    </AuthWrapper>
  );
};

export default Auth;
