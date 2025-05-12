
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthHeader from '@/components/auth/AuthHeader';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import ErrorBoundary from '@/components/ErrorBoundary';

const Auth = () => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { from?: Location, redirectToSubscription?: boolean };

  // Get initial tab from URL if present
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      if (tab === 'signup') {
        setActiveTab('signup');
      }
    } catch (error) {
      console.error("Error parsing URL params:", error);
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
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
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
      }
    } catch (error) {
      console.error("Error parsing registration data:", error);
      sessionStorage.removeItem('registration_data');
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

  // If user is already authenticated, redirect to dashboard or subscription
  if (isAuthenticated) {
    console.log("Auth page: User is authenticated, redirecting to appropriate page");
    if (state?.redirectToSubscription) {
      return <Navigate to="/subscription" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ErrorBoundary fallback={
      <div className="flex min-h-screen items-center justify-center bg-red-50 dark:bg-red-900/20 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">שגיאה בטעינת עמוד ההתחברות</h2>
          <p className="mb-4">אירעה שגיאה בטעינת העמוד. אנא נסה שוב מאוחר יותר.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            נסה שוב
          </button>
        </div>
      </div>
    }>
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-background to-background/90 p-4 dark:bg-background dark:text-foreground" dir="rtl">
        <div className="w-full max-w-md space-y-6">
          <AuthHeader />
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')} defaultValue="login">
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
    </ErrorBoundary>
  );
};

export default Auth;
