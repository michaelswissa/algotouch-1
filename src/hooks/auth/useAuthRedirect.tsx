
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { AuthStorageService } from '@/services/storage/AuthStorageService';

/**
 * Hook to handle redirecting authenticated users away from the auth page
 */
export const useAuthRedirect = (isAuthenticated: boolean) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      const contractData = sessionStorage.getItem('contract_data');
      
      if (contractData) {
        // User has contract data (might be in subscription flow)
        PaymentLogger.log('Auth redirect: User authenticated with contract data, redirecting to subscription');
        navigate('/subscription', { replace: true });
      } else {
        PaymentLogger.log('Auth redirect: User authenticated, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);
};

/**
 * Hook to check registration data on auth page
 */
export const useRegistrationCheck = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const isValid = AuthStorageService.isRegistrationValid();
    
    if (isValid) {
      // User has valid registration data, redirect to subscription page
      PaymentLogger.log('Registration check: Found valid registration data, redirecting to subscription');
      navigate('/subscription', { replace: true, state: { isRegistering: true } });
    }
  }, [navigate]);
};
