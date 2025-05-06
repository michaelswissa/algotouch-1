import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { StorageService } from '@/services/storage/StorageService';
import { toast } from 'sonner';

export const useAuthRedirect = (isAuthenticated: boolean) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { 
    from?: Location, 
    redirectToSubscription?: boolean,
    isRegistering?: boolean
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const redirectLoggedInUser = () => {
      PaymentLogger.log("Auth page: User is authenticated, redirecting");
      
      // Get redirect parameter from query string if present
      const params = new URLSearchParams(location.search);
      const redirectTo = params.get('redirect');
      
      // If redirect parameter is present, use that
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
        return;
      }
      
      if (state?.redirectToSubscription) {
        navigate("/subscription", { replace: true });
        return;
      }
      
      // Check if we're in the middle of a registration flow
      const registrationData = StorageService.getRegistrationData();
      const contractData = StorageService.getContractData();
      
      if ((registrationData && StorageService.isRegistrationValid()) || contractData) {
        PaymentLogger.log("Auth: User authenticated with registration data, redirecting to subscription");
        navigate("/subscription", { replace: true });
        return;
      }
      
      navigate("/dashboard", { replace: true });
    };

    redirectLoggedInUser();
  }, [isAuthenticated, navigate, location, state]);
};

export const useRegistrationCheck = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
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
};
