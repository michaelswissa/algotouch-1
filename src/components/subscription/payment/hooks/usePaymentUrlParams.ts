
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
      
      // Special case: if we have step=completion in the URL, force that step
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get('step');
      
      if (stepParam === 'completion') {
        console.log('Forcing completion step based on URL parameter');
        parsedSession.step = 'completion';
        sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
      }
      
      if (parsedSession.step !== 'payment' && parsedSession.step !== 'completion') {
        console.log(`Current step is ${parsedSession.step}, not processing payment URL params`);
        return;
      }
      
      // Only process URL params if we're on the payment or completion step
      console.log('Processing payment URL parameters');
      
      const error = params.get('error');
      const success = params.get('success');
      const regId = params.get('regId');
      const lpId = params.get('lpId');
      
      if (error === 'true') {
        toast.error('התשלום נכשל, אנא נסה שנית');
      } else if (success === 'true') {
        // Force the step to payment while we verify
        parsedSession.step = 'payment';
        sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
        
        // If we have a lowProfileId, we need to verify the payment
        if (lpId) {
          console.log('Payment success with lowProfileId, verifying payment:', lpId);
          verifyPaymentAndCompleteRegistration(lpId, regId || null, onPaymentComplete, setIsLoading);
        } else if (regId) {
          console.log('Payment success with registration ID, processing registration');
          // Need to verify payment and complete registration with regId
          retrieveAndProcessRegistrationData(regId, onPaymentComplete, setIsLoading);
        } else {
          console.log('Payment success without verification parameters');
          toast.success('התשלום התקבל בהצלחה!');
          
          // Force to completion step
          parsedSession.step = 'completion';
          sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
          
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
      retrieveAndProcessRegistrationData(storedRegId, onPaymentComplete, setIsLoading);
    }
  }, [onPaymentComplete]);
};
