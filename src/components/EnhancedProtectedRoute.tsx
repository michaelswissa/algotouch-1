
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireCompletedRegistration?: boolean;
  requireActiveSubscription?: boolean;
  publicPaths?: string[];
}

const EnhancedProtectedRoute: React.FC<EnhancedProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireCompletedRegistration = false,
  requireActiveSubscription = false,
  publicPaths = ['/auth']
}) => {
  const { isAuthenticated, loading, initialized, user } = useAuth();
  const { subscription, details, loading: subscriptionLoading } = useSubscription();
  const location = useLocation();
  const [hasRegistrationData, setHasRegistrationData] = useState(false);
  const [isValidRegistration, setIsValidRegistration] = useState(false);
  const [registrationCheckComplete, setRegistrationCheckComplete] = useState(false);
  const [hasValidContract, setHasValidContract] = useState(false);
  
  // Check if path is in the public paths list
  const isPublicPath = publicPaths.some(publicPath => 
    location.pathname === publicPath || location.pathname.startsWith(`${publicPath}/`)
  );
  
  // Check if it's a subscription path
  const isSubscriptionPath = location.pathname === '/subscription' || 
                             location.pathname.startsWith('/subscription/');
  
  // Check for payment update path
  const isPaymentUpdatePath = location.pathname === '/update-payment';

  // Check if user has a pending registration in session storage
  useEffect(() => {
    const checkRegistrationData = () => {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          const registrationTime = new Date(data.registrationTime);
          const now = new Date();
          const timeDiffInMinutes = (now.getTime() - registrationTime.getTime()) / (1000 * 60);
          
          // Registration data is valid if less than 30 minutes old
          const isValid = timeDiffInMinutes < 30;
          setHasRegistrationData(true);
          setIsValidRegistration(isValid);
          
          if (!isValid) {
            console.log("Registration data is stale");
            sessionStorage.removeItem('registration_data');
          }
        } catch (error) {
          console.error("Error parsing registration data:", error);
          setHasRegistrationData(false);
          setIsValidRegistration(false);
        }
      } else {
        setHasRegistrationData(false);
        setIsValidRegistration(false);
      }
      setRegistrationCheckComplete(true);
    };

    checkRegistrationData();
  }, [location.pathname]);

  // Check if user has completed registration with contract and payment
  useEffect(() => {
    const checkContractStatus = async () => {
      if (!user?.id) {
        return setHasValidContract(false);
      }
      
      // Check if the user has a valid contract signature
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setHasValidContract(!!data);
    };
    
    if (user?.id) {
      checkContractStatus();
    }
  }, [user]);

  // Show consistent loader while auth is initializing
  if (!initialized || loading || (requireActiveSubscription && subscriptionLoading) || !registrationCheckComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Check for registration in progress from location state
  const isRegistering = location.state?.isRegistering === true;

  // Allow access to public paths regardless of auth status
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Handle subscription path logic
  if (isSubscriptionPath) {
    if (isAuthenticated || (hasRegistrationData && isValidRegistration) || isRegistering) {
      // Check if the user already has a completed subscription
      if (isAuthenticated && subscription?.status === 'active' && subscription?.contract_signed) {
        toast.info('יש לך כבר מנוי פעיל');
        return <Navigate to="/my-subscription" replace />;
      }
      
      return <>{children}</>;
    }
    
    return <Navigate to="/auth" state={{ from: location, redirectToSubscription: true }} replace />;
  }

  // Handle payment update path
  if (isPaymentUpdatePath) {
    if (!isAuthenticated) {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }
    
    // Allow access if there is a payment issue or the user is in grace period
    if (subscription?.status === 'failed' || (details && details.gracePeriodActive)) {
      return <>{children}</>;
    }
    
    // If no payment issue, redirect to subscription page
    toast.info('אין צורך בעדכון פרטי תשלום כרגע');
    return <Navigate to="/my-subscription" replace />;
  }

  // Authentication required checks
  if (requireAuth && !isAuthenticated) {
    console.log("User is not authenticated, redirecting to auth");
    // Redirect to login page if not authenticated
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  // Check if subscription is required and active
  if (requireActiveSubscription && isAuthenticated) {
    // If subscription check is required and there is no active subscription
    if (!subscription || subscription?.status === 'cancelled' || subscription?.status === 'failed') {
      toast.error('נדרש מנוי פעיל כדי לגשת לעמוד זה');
      return <Navigate to="/subscription" state={{ from: location }} replace />;
    }
    
    // Check if the subscription is in grace period
    if (details && details.gracePeriodActive === true) {
      // Allow access during grace period with a warning
      toast.warning(`נמצא בתקופת חסד: נותרו ${details.gracePeriodDays || 0} ימים לעדכון פרטי תשלום`, {
        action: {
          label: 'עדכן',
          onClick: () => window.location.href = '/update-payment'
        }
      });
    }
  }
  
  // Check if completed registration is required
  if (requireCompletedRegistration && isAuthenticated) {
    // Check for incomplete registration
    const hasPaymentMethod = subscription?.payment_method !== null;
    
    if (!subscription || !hasPaymentMethod || !subscription.contract_signed) {
      toast.error('יש להשלים את תהליך ההרשמה והתשלום');
      return <Navigate to="/subscription" state={{ from: location }} replace />;
    }
  }

  // If already authenticated and trying to access login/register
  if (!requireAuth && isAuthenticated) {
    console.log("User is already authenticated, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default EnhancedProtectedRoute;
