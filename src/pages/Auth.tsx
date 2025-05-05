import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import AuthHeader from '@/components/auth/AuthHeader';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { Spinner } from '@/components/ui/spinner';
import { StorageService } from '@/services/storage/StorageService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { toast } from 'sonner';

const Auth = () => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { 
    from?: Location, 
    redirectToSubscription?: boolean,
    isRegistering?: boolean
  };

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
    if (state?.redirectToSubscription || state?.isRegistering) {
      setActiveTab('signup');
    }
  }, [state]);

  // Check if there's valid registration data in session storage
  useEffect(() => {
    const checkSessionData = () => {
      try {
        // First check if registration data is valid
        if (StorageService.isRegistrationValid()) {
          const registrationData = StorageService.getRegistrationData();
          
          // Check if we have a contract
          const contractData = StorageService.getContractData();
          
          // If we have valid contract data with plan selection, redirect to subscription
          if (contractData?.planId) {
            PaymentLogger.log("Auth: Valid contract data found, redirecting to subscription");
            navigate('/subscription', { replace: true });
            return;
          }
          
          // Otherwise check if we're in the registration flow
          if (registrationData && location.state?.isRegistering) {
            PaymentLogger.log("Auth: Valid registration data found, redirecting to subscription");
            navigate('/subscription', { replace: true, state: { isRegistering: true } });
            return;
          }
        } else {
          // Clear expired registration data
          const hasExpired = StorageService.getRegistrationData().registrationTime;
          
          if (hasExpired) {
            PaymentLogger.log("Auth: Clearing expired registration data");
            StorageService.clearAllSubscriptionData();
            toast.info('מידע הרשמה קודם פג תוקף, אנא הירשם שנית');
          }
        }
      } catch (error) {
        PaymentLogger.error("Error checking session data:", error);
        StorageService.clearAllSubscriptionData();
      }
    };
    
    checkSessionData();
  }, [navigate, location.state]);

  // Show loading state while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/90 p-4">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // If user is already authenticated, redirect to dashboard or subscription
  if (isAuthenticated) {
    PaymentLogger.log("Auth page: User is authenticated, redirecting");
    
    if (state?.redirectToSubscription) {
      return <Navigate to="/subscription" replace />;
    }
    
    // Check if we're in the middle of a registration flow
    const registrationData = StorageService.getRegistrationData();
    const contractData = StorageService.getContractData();
    
    if ((registrationData && StorageService.isRegistrationValid()) || contractData) {
      PaymentLogger.log("Auth: User authenticated with registration data, redirecting to subscription");
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
