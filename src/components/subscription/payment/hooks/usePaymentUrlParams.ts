
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
      const forceRedirect = params.get('forceRedirect');
      
      console.log('Processing URL parameters:', {
        stepParam,
        success,
        error,
        regId,
        lpId,
        forceRedirect,
        currentStep: parsedSession.step
      });
      
      // Special case: Force completion step
      if (stepParam === 'completion') {
        console.log('Forcing completion step based on URL parameter');
        parsedSession.step = 'completion';
        sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
        
        // If success is also true, set payment status
        if (success === 'true') {
          setPaymentStatus({
            success: true,
            error: false,
            regId,
            lpId
          });
        }
      }
      
      // Check if we're in an iframe and handle breaking out
      const isIframe = window !== window.top;
      if (isIframe) {
        console.log('Detected we are in iframe, handling parent window navigation');
        
        // If success or error is detected in iframe, always redirect the parent window
        if (success === 'true' || error === 'true' || forceRedirect === 'true') {
          try {
            // Construct redirect URL for parent window
            const currentUrl = new URL(window.location.href);
            
            // Always add target=_top parameter
            currentUrl.searchParams.set('target', '_top');
            
            // Inform parent window to redirect
            window.top.postMessage({
              type: 'cardcom_redirect',
              url: currentUrl.toString(),
              success: success === 'true',
              forceRedirect: true
            }, '*');
            
            // Also attempt direct navigation
            window.top.location.href = currentUrl.toString();
            
            console.log('Sent redirect message to parent window:', currentUrl.toString());
            return; // Stop processing to avoid duplicate calls
          } catch (err) {
            console.error('Error redirecting parent window:', err);
          }
        }
      }
      
      // Only process URL params if we're on the right step
      if (parsedSession.step !== 'payment' && parsedSession.step !== 'completion' && !forceRedirect) {
        console.log(`Current step is ${parsedSession.step}, not processing payment URL params`);
        return;
      }
      
      // Process URL params
      console.log('Processing payment URL parameters');
      
      if (error === 'true') {
        toast.error('התשלום נכשל, אנא נסה שנית');
        setPaymentStatus({
          success: false,
          error: true,
          errorMessage: 'התשלום נכשל, אנא נסה שנית'
        });
      } else if (success === 'true') {
        // Force the step to completion to ensure we show the success page
        parsedSession.step = 'completion';
        sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
        
        setPaymentStatus({
          success: true,
          error: false,
          regId,
          lpId
        });
        
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
          setPaymentStatus({
            success: true,
            error: false
          });
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
  }, [onPaymentComplete, setIsLoading]);
  
  return paymentStatus;
};
