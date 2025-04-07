import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import { useEnhancedSubscription } from '@/contexts/subscription/EnhancedSubscriptionContext';
import AuthHeader from '@/components/auth/AuthHeader';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

const Auth = () => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const { status, isChecking } = useEnhancedSubscription();
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

  // Check if there's valid registration data in session storage
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        const registrationTime = new Date(data.registrationTime);
        const now = new Date();
        const timeDiffInMinutes = (now.getTime() - registrationTime.getTime()) / (1000 * 60);
        
        // If registration is fresh (less than 30 minutes old) and explicitly coming from signup
        if (timeDiffInMinutes < 30 && location.state?.isRegistering) {
          console.log("Auth: Valid registration data found, redirecting to subscription");
          navigate('/subscription', { replace: true, state: { isRegistering: true } });
        } else if (timeDiffInMinutes >= 30) {
          // Clear stale registration data older than 30 minutes
          console.log("Auth: Clearing stale registration data");
          sessionStorage.removeItem('registration_data');
          toast.info('מידע הרשמה קודם פג תוקף, אנא הירשם שנית');
        }
      } catch (error) {
        console.error("Error parsing registration data:", error);
        sessionStorage.removeItem('registration_data');
      }
    }
  }, [navigate, location.state]);

  // Show loading state while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/90 p-4">
        <Spinner size="lg" />
      </div>
    );
  }

  // If user is already authenticated, check if they've completed registration
  if (isAuthenticated) {
    if (isChecking) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/90 p-4">
          <Spinner size="lg" />
        </div>
      );
    }
    
    console.log("Auth page: User is authenticated, checking registration status");
    
    // If user hasn't completed registration, redirect to appropriate step
    if (status && !status.hasCompletedRegistration) {
      return <Navigate to="/subscription?step=1" replace />;
    }
    
    // If user hasn't signed contract, redirect to contract step
    if (status && !status.hasSignedContract) {
      return <Navigate to="/subscription?step=2" replace />;
    }
    
    // If user needs to update payment, redirect to payment update page
    if (status && status.requiresPaymentUpdate) {
      return <Navigate to="/update-payment" replace />;
    }
    
    // Otherwise, redirect to dashboard or requested page
    if (state?.redirectToSubscription) {
      return <Navigate to="/subscription" replace />;
    }
    return <Navigate to="/dashboard" replace />;
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
