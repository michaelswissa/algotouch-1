
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
      
      // Get URL parameters
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get('step');
      const success = params.get('success');
      const error = params.get('error');
      const regId = params.get('regId');
      const lpId = params.get('lpId');
      
      // Special case: Force completion step
      if (stepParam === 'completion') {
        console.log('Forcing completion step based on URL parameter');
        parsedSession.step = 'completion';
        sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
      }
      
      // If we detect success parameter and we're in an iframe, attempt to break out
      const isIframe = window !== window.top;
      if (isIframe && (success === 'true' || error === 'true')) {
        console.log('Detected success/error in iframe, redirecting top window');
        const currentUrl = window.location.href;
        if (currentUrl.includes('target=_top')) {
          window.top.location.href = currentUrl;
          return; // Stop processing to avoid duplicate calls
        }
      }
      
      // Only process URL params if we're on the right step
      if (parsedSession.step !== 'payment' && parsedSession.step !== 'completion') {
        console.log(`Current step is ${parsedSession.step}, not processing payment URL params`);
        return;
      }
      
      // Process URL params
      console.log('Processing payment URL parameters');
      
      if (error === 'true') {
        toast.error('התשלום נכשל, אנא נסה שנית');
      } else if (success === 'true') {
        // Force the step to completion to ensure we show the success page
        parsedSession.step = 'completion';
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
