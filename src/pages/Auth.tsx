import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import AuthHeader from '@/components/auth/AuthHeader';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import AdminSetupButton from '@/components/auth/AdminSetupButton';

const Auth = () => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { from?: Location, redirectToSubscription?: boolean };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'signup') {
      setActiveTab('signup');
    }
  }, [location]);

  useEffect(() => {
    if (state?.redirectToSubscription) {
      setActiveTab('signup');
    }
  }, [state]);

  useEffect(() => {
    const checkSessionData = () => {
      const contractData = sessionStorage.getItem('contract_data');
      const registrationData = sessionStorage.getItem('registration_data');
      
      if (contractData || registrationData) {
        try {
          if (contractData) {
            const data = JSON.parse(contractData);
            if (data.selectedPlan) {
              console.log("Auth: Valid contract data found, redirecting to subscription");
              navigate('/subscription', { replace: true });
              return;
            }
          }
          
          if (registrationData) {
            const data = JSON.parse(registrationData);
            const registrationTime = new Date(data.registrationTime);
            const now = new Date();
            const timeDiffInMinutes = (now.getTime() - registrationTime.getTime()) / (1000 * 60);
            
            if (timeDiffInMinutes < 30 && location.state?.isRegistering) {
              console.log("Auth: Valid registration data found, redirecting to subscription");
              navigate('/subscription', { replace: true, state: { isRegistering: true } });
            } else if (timeDiffInMinutes >= 30) {
              console.log("Auth: Clearing stale registration data");
              sessionStorage.removeItem('registration_data');
              sessionStorage.removeItem('contract_data');
              toast.info('מידע הרשמה קודם פג תוקף, אנא הירשם שנית');
            }
          }
        } catch (error) {
          console.error("Error checking session data:", error);
          sessionStorage.removeItem('registration_data');
          sessionStorage.removeItem('contract_data');
        }
      }
    };
    
    checkSessionData();
  }, [navigate, location.state]);

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/90 p-4">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isAuthenticated) {
    console.log("Auth page: User is authenticated, redirecting to appropriate page");
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
        
        {import.meta.env.DEV && <AdminSetupButton />}
      </div>
    </div>
  );
};

export default Auth;
