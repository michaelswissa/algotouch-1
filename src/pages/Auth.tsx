
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import AuthHeader from '@/components/auth/AuthHeader';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { Spinner } from '@/components/ui/spinner';
import { useRegistration } from '@/contexts/registration/RegistrationContext';

const Auth = () => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const { registrationData, isInitializing } = useRegistration();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { from?: Location, redirectToSubscription?: boolean };

  // Get initial tab from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'signup') {
      setActiveTab('signup');
    }
  }, [location]);

  // Check if the state specifies to show the signup tab
  useEffect(() => {
    if (state?.redirectToSubscription) {
      setActiveTab('signup');
    }
  }, [state]);

  // Show loading state while auth is initializing
  if (!initialized || loading || isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/90 p-4">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // If user is already authenticated, redirect to dashboard or subscription
  if (isAuthenticated) {
    console.log("Auth page: User is authenticated, redirecting to appropriate page");
    if (state?.redirectToSubscription) {
      return <Navigate to="/subscription" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // If there's valid registration data, redirect to subscription
  if (!isAuthenticated && registrationData.isValid) {
    console.log("Auth page: Valid registration data found, redirecting to subscription");
    return <Navigate to="/subscription" replace state={{ isRegistering: true }} />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-background to-background/90 p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        <AuthHeader />
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signup">הרשמה</TabsTrigger>
            <TabsTrigger value="login">התחברות</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          
          <TabsContent value="signup">
            <SignupForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
