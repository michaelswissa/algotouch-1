
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import AuthHeader from '@/components/auth/AuthHeader';
import { Spinner } from '@/components/ui/spinner';
import { StorageService } from '@/services/storage/StorageService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { toast } from 'sonner';
import BeamsBackground from '@/components/BeamsBackground';

// Lazy load the forms
const LoginForm = lazy(() => import('@/components/auth/LoginForm'));
const SignupForm = lazy(() => import('@/components/auth/SignupForm'));

// FormLoader component
const FormLoader = () => (
  <div className="flex justify-center items-center py-8">
    <Spinner className="h-6 w-6" />
  </div>
);

const Auth = () => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = location.state as { 
    from?: Location, 
    redirectToSubscription?: boolean,
    isRegistering?: boolean
  };

  // Performance mark for timing component load
  useEffect(() => {
    if (typeof performance !== 'undefined') {
      performance.mark('auth-page-rendered');
    }
  }, []);

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

  // Handle redirect query parameter if present
  const redirectTo = searchParams.get('redirect');

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

  // If user is already authenticated, redirect to appropriate page
  if (isAuthenticated) {
    PaymentLogger.log("Auth page: User is authenticated, redirecting");
    
    // If redirect parameter is present, use that
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    
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

  const getTabTitle = () => {
    return activeTab === 'login' ? 'התחברות' : 'הרשמה';
  };
  
  const getTabDescription = () => {
    return activeTab === 'login' ? 'הזן את פרטי ההתחברות שלך' : 'צור חשבון חדש';
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'login' | 'signup');
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4" dir="rtl">
      <BeamsBackground />
      
      <div className="w-full max-w-md space-y-6 backdrop-blur-sm bg-background/80 p-6 rounded-lg shadow-lg animate-fade-in">
        <AuthHeader>
          <div className="w-full">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="relative w-full max-w-xs mx-auto mt-2">
                <TabsList className="grid grid-cols-2 w-full rounded-full border border-border/20 p-1 bg-muted/30 backdrop-blur-md overflow-hidden">
                  {/* Switch track - fixed for RTL */}
                  <div 
                    className="absolute inset-y-1 rounded-full bg-primary transition-all duration-300 ease-in-out z-0"
                    style={{ 
                      width: '50%', 
                      right: activeTab === 'login' ? '0%' : '50%' 
                    }}
                  />
                  
                  {/* Tab triggers */}
                  <TabsTrigger 
                    value="login" 
                    className="rounded-full py-1.5 px-3 relative z-10 transition-colors duration-300 data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:text-foreground"
                  >
                    התחברות
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="rounded-full py-1.5 px-3 relative z-10 transition-colors duration-300 data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground/70 hover:text-foreground"
                  >
                    הרשמה
                  </TabsTrigger>
                </TabsList>
              </div>
            
              <div className="space-y-4 mt-8">
                <div className="text-right">
                  <h2 className="text-2xl font-semibold">{getTabTitle()}</h2>
                  <p className="text-sm text-muted-foreground">{getTabDescription()}</p>
                </div>
                
                <div className="w-full">
                  <TabsContent value="login" className="mt-0">
                    <Suspense fallback={<FormLoader />}>
                      <LoginForm redirectTo={redirectTo} />
                    </Suspense>
                  </TabsContent>
                  <TabsContent value="signup" className="mt-0">
                    <Suspense fallback={<FormLoader />}>
                      <SignupForm redirectTo={redirectTo} />
                    </Suspense>
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>
        </AuthHeader>
      </div>
    </div>
  );
};

export default Auth;
