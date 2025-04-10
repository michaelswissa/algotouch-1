
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { usePaymentProcessing } from './usePaymentProcessing';

export const usePaymentUrlParams = (
  onPaymentComplete: () => void,
  setIsLoading: (val: boolean) => void
) => {
  const { verifyPaymentAndCompleteRegistration, retrieveAndProcessRegistrationData } = usePaymentProcessing();
  const [paymentStatus, setPaymentStatus] = useState<{
    success: boolean | null;
    error: boolean | null;
    errorMessage?: string;
    regId?: string | null;
    lpId?: string | null;
  }>({
    success: null,
    error: null
  });

  useEffect(() => {
    // Immediately get URL parameters on mount
    const processUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get('step');
      const success = params.get('success');
      const error = params.get('error');
      const regId = params.get('regId');
      const lpId = params.get('lpId');
      const forceTop = params.get('force_top');
      
      console.log('Processing URL parameters:', {
        stepParam,
        success,
        error,
        regId,
        lpId,
        forceTop
      });
      
      // Handle forced completion only with combination of success=true AND force_top=true
      if (success === 'true' && forceTop === 'true') {
        console.log('Success=true and force_top=true detected, this means we have a verified payment');
        
        // Set payment as successful in state
        setPaymentStatus({
          success: true,
          error: false,
          regId,
          lpId
        });
        
        // If we have a payment ID (lpId), verify the payment
        if (lpId) {
          console.log('Payment success with lowProfileId, verifying payment:', lpId);
          verifyPaymentAndCompleteRegistration(lpId, regId || null, onPaymentComplete, setIsLoading);
          return; // Exit early after handling
        } 
        
        // If we have registration data, process it
        if (regId) {
          console.log('Payment success with registration ID, processing registration');
          retrieveAndProcessRegistrationData(regId, onPaymentComplete, setIsLoading);
          return; // Exit early after handling
        }
        
        // Don't automatically complete if we don't have verification data
        console.log('Payment success indicated but no verification parameters');
        toast.info('אימות התשלום בתהליך...');
      }
      
      // Process URL params for error states
      if (error === 'true') {
        toast.error('התשלום נכשל, אנא נסה שנית');
        setPaymentStatus({
          success: false,
          error: true,
          errorMessage: 'התשלום נכשל, אנא נסה שנית'
        });
      }
    };
    
    // Process URL parameters immediately
    processUrlParams();
    
    // Also check for temp registration ID in localStorage
    const storedRegId = localStorage.getItem('temp_registration_id');
    if (storedRegId) {
      console.log('Found stored registration ID:', storedRegId);
      // Don't automatically process registration data, let the payment flow complete first
      setPaymentStatus(prev => ({
        ...prev,
        regId: storedRegId
      }));
    }
    
  }, [onPaymentComplete, setIsLoading]);
  
  return paymentStatus;
};
