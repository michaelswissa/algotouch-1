
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
      
      // TOP PRIORITY: Check for success parameter with force_top - this means we're already broken out of the iframe
      if (success === 'true' && forceTop === 'true') {
        console.log('Success=true and force_top=true detected, this means we are already in the top window');
        
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
      
      // Secondary priority: Check for success without force_top
      if (success === 'true') {
        console.log('Success=true detected in URL, attempting to break out of iframe');
        
        // This could be inside an iframe, try to break out
        try {
          // Construct a new URL with force_top=true to ensure we get to the right handler
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('force_top', 'true');
          
          // Try to navigate top window directly
          if (window !== window.top) {
            console.log('Detected we are in iframe, attempting to navigate parent window');
            
            // Notify parent window to navigate
            window.parent.postMessage({
              type: 'cardcom_redirect',
              url: currentUrl.toString(),
              success: true,
              forceRedirect: true,
              lpId
            }, '*');
            
            // Also try direct navigation
            try {
              window.top.location.href = currentUrl.toString();
            } catch (navErr) {
              console.error('Direct navigation failed:', navErr);
              
              // Try window.open as fallback
              window.open(currentUrl.toString(), '_top');
            }
          } else {
            // We're already in top window, just update the URL and trigger a re-process
            window.history.replaceState({}, '', currentUrl.toString());
            
            // Set payment as successful
            setPaymentStatus({
              success: true,
              error: false,
              regId,
              lpId
            });
            
            // Force refresh the page to ensure proper processing
            window.location.href = currentUrl.toString();
          }
        } catch (e) {
          console.error('Error breaking out of iframe:', e);
        }
        
        return; // Exit early after handling
      }
      
      // Process step parameter if available
      if (stepParam === 'completion' && forceTop === 'true') {
        console.log('Forcing completion step based on URL parameter with force_top');
        
        try {
          const sessionData = sessionStorage.getItem('subscription_flow');
          const parsedSession = sessionData 
            ? JSON.parse(sessionData) 
            : { step: 'completion' };
          
          parsedSession.step = 'completion';
          sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
          
          // Call payment complete
          onPaymentComplete();
        } catch (e) {
          console.error('Error updating session for completion step:', e);
          // Still try to complete
          onPaymentComplete();
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
      const currentForceTop = currentParams.get('force_top');
      
      if (currentSuccess === 'true' && currentForceTop === 'true' && paymentStatus.success !== true) {
        console.log('Success and force_top parameters detected during interval check');
        processUrlParams();
      }
    }, 1000);
    
    return () => clearInterval(checkIntervalId);
  }, [onPaymentComplete, setIsLoading]);
  
  return paymentStatus;
};
