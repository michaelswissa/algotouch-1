
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
      const forceRedirect = params.get('forceRedirect');
      
      console.log('Processing URL parameters:', {
        stepParam,
        success,
        error,
        regId,
        lpId,
        forceRedirect
      });
      
      // TOP PRIORITY: Check for success parameter - this takes precedence over all other logic
      if (success === 'true') {
        console.log('Success=true detected in URL, forcing completion step');
        
        // Force session data to completion step
        try {
          const sessionData = sessionStorage.getItem('subscription_flow');
          let parsedSession = sessionData 
            ? JSON.parse(sessionData) 
            : { step: 'completion' };
          
          // Always force to completion step when success=true
          parsedSession.step = 'completion';
          sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
          
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
          
          // If we have neither lpId nor regId, simply complete
          console.log('Payment success without verification parameters');
          toast.success('התשלום התקבל בהצלחה!');
          
          // Call payment complete directly
          onPaymentComplete();
          return; // Exit early after handling success=true
        } catch (e) {
          console.error('Error processing success URL parameters:', e);
          // Still attempt to complete payment even if session data processing fails
          toast.success('התשלום התקבל בהצלחה!');
          onPaymentComplete();
          return; // Exit early
        }
      }
      
      // Process step parameter if available
      if (stepParam === 'completion') {
        console.log('Forcing completion step based on URL parameter');
        
        try {
          const sessionData = sessionStorage.getItem('subscription_flow');
          const parsedSession = sessionData 
            ? JSON.parse(sessionData) 
            : { step: 'completion' };
          
          parsedSession.step = 'completion';
          sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
        } catch (e) {
          console.error('Error updating session for completion step:', e);
        }
      }
      
      // Check if we're in an iframe and handle breaking out
      if (window !== window.top) {
        console.log('Detected we are in iframe, handling parent window navigation');
        
        // If success or error is detected in iframe, always redirect the parent window
        if (success === 'true' || error === 'true' || forceRedirect === 'true') {
          try {
            // Construct redirect URL for parent window
            const currentUrl = new URL(window.location.href);
            
            // Always add target=_top parameter
            currentUrl.searchParams.set('target', '_top');
            
            // Always add iframe=0 to prevent iframe behavior
            currentUrl.searchParams.set('iframe', '0');
            
            // Inform parent window to redirect
            window.parent.postMessage({
              type: 'cardcom_redirect',
              url: currentUrl.toString(),
              success: success === 'true',
              forceRedirect: true,
              lpId
            }, '*');
            
            // Also attempt direct navigation
            try {
              window.top.location.href = currentUrl.toString();
              console.log('Sent direct navigation command to parent window');
            } catch (navErr) {
              console.error('Direct navigation failed:', navErr);
            }
          } catch (err) {
            console.error('Error redirecting parent window:', err);
          }
        }
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
      retrieveAndProcessRegistrationData(storedRegId, onPaymentComplete, setIsLoading);
    }
    
    // Set up an interval to continuously check for URL changes
    // This helps catch redirects that might happen after initial load
    const checkIntervalId = setInterval(() => {
      const currentParams = new URLSearchParams(window.location.search);
      const currentSuccess = currentParams.get('success');
      
      if (currentSuccess === 'true' && paymentStatus.success !== true) {
        console.log('Success parameter detected during interval check');
        processUrlParams();
      }
    }, 1000);
    
    return () => clearInterval(checkIntervalId);
  }, [onPaymentComplete, setIsLoading]);
  
  return paymentStatus;
};
