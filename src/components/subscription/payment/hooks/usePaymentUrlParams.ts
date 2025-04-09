
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
    // Get URL parameters immediately regardless of session status
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
    
    // CRITICAL: Immediately check if success=true is in the URL and force completion
    if (success === 'true') {
      console.log('Success=true detected in URL, forcing completion step');
      
      // Create or update session data to completion step
      try {
        // Get session data if available
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
          
          // Call payment complete with a small delay to ensure state is updated
          setTimeout(() => {
            onPaymentComplete();
          }, 300);
        }
      } catch (e) {
        console.error('Error processing success URL parameters:', e);
        // Still attempt to complete payment even if session data processing fails
        toast.success('התשלום התקבל בהצלחה!');
        setTimeout(() => {
          onPaymentComplete();
        }, 300);
      }
      
      return; // Exit early after handling success=true
    }
    
    // Check session data for other URL parameter processing
    const sessionData = sessionStorage.getItem('subscription_flow');
    
    if (!sessionData) {
      console.log('No session data found, skipping additional URL parameter processing');
      return;
    }
    
    try {
      const parsedSession = JSON.parse(sessionData);
      
      console.log('Session data found:', {
        currentStep: parsedSession.step,
        params: Object.fromEntries(params.entries())
      });
      
      // Special case: Force completion step if specified in URL
      if (stepParam === 'completion') {
        console.log('Forcing completion step based on URL parameter');
        parsedSession.step = 'completion';
        sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
        
        // Only update payment status if not already processed
        if (paymentStatus.success !== true) {
          setPaymentStatus({
            success: true,
            error: false,
            regId,
            lpId
          });
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
            
            console.log('Sent redirect message to parent window:', currentUrl.toString());
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
