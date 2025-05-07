
import { useEffect } from 'react';
import { toast } from 'sonner';
import { usePaymentProcessing } from './usePaymentProcessing';

export const usePaymentUrlParams = (
  onPaymentComplete: () => void,
  setIsLoading: (val: boolean) => void
) => {
  const { verifyPaymentAndCompleteRegistration, retrieveAndProcessRegistrationData } = usePaymentProcessing();

  useEffect(() => {
    // Check if we're on the correct step before processing payment URL params
    const sessionData = sessionStorage.getItem('subscription_flow');
    if (!sessionData) {
      console.log('No session data found, skipping payment URL parameter processing');
      return;
    }
    
    try {
      const parsedSession = JSON.parse(sessionData);
      if (parsedSession.step !== 'payment' && parsedSession.step !== 'completion') {
        console.log(`Current step is ${parsedSession.step}, not processing payment URL params`);
        return;
      }
      
      // Only process URL params if we're on the payment or completion step
      console.log('Processing payment URL parameters');
      
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      const success = params.get('success');
      const regId = params.get('regId');
      
      if (error === 'true') {
        toast.error('התשלום נכשל, אנא נסה שנית');
      } else if (success === 'true') {
        if (regId) {
          console.log('Payment success with registration ID, verifying payment');
          // Need to verify payment and complete registration
          verifyPaymentAndCompleteRegistration(regId, onPaymentComplete, setIsLoading);
        } else {
          console.log('Payment success without registration ID, completing payment');
          toast.success('התשלום התקבל בהצלחה!');
          onPaymentComplete();
        }
      }
    } catch (error) {
      console.error('Error processing payment URL params:', error);
    }
    
    // Always check for temp registration ID in localStorage
    const storedRegId = localStorage.getItem('temp_registration_id');
    if (storedRegId) {
      console.log('Found stored registration ID:', storedRegId);
      retrieveAndProcessRegistrationData(storedRegId, onPaymentComplete);
    }
  }, [onPaymentComplete]);
};
