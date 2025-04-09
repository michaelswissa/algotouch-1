
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import getIframeBreakoutScript from './IframeBreakoutScript';

/**
 * Custom hook that handles breaking out of iframes and detecting successful payments
 */
export const useIframeBreakout = (iframeRef: React.RefObject<HTMLIFrameElement>) => {
  const navigate = useNavigate();
  const breakoutAttempted = useRef(false);
  
  // Function to handle successful payment detection and breakout
  const handleSuccessfulPayment = (url?: string, lpId?: string) => {
    // Prevent duplicate breakout attempts
    if (breakoutAttempted.current) return;
    breakoutAttempted.current = true;
    
    console.log('Payment successful, breaking out of iframe and navigating', { url, lpId });
    
    // Update session storage to completion step
    try {
      const sessionData = sessionStorage.getItem('subscription_flow');
      const parsedSession = sessionData ? JSON.parse(sessionData) : {};
      parsedSession.step = 'completion';
      sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
      
      // Build redirect URL with all necessary parameters
      const urlParams = new URLSearchParams();
      urlParams.set('step', 'completion');
      urlParams.set('success', 'true');
      urlParams.set('plan', parsedSession.selectedPlan || '');
      
      if (lpId) {
        urlParams.set('lpId', lpId);
      }
      
      // Navigate to completion step with all parameters - use replace to prevent back button issues
      const completeUrl = `/subscription?${urlParams.toString()}`;
      console.log('Navigating to:', completeUrl);
      
      // Force redirect to break out of any potential iframe
      window.top.location.href = `${window.location.origin}${completeUrl}`;
      
      // Also try the React navigate as a fallback
      try {
        navigate(completeUrl, { replace: true });
      } catch (e) {
        console.error('Navigation error:', e);
      }
      
      toast.success('התשלום התקבל בהצלחה!');
    } catch (e) {
      console.error('Error updating session data:', e);
      // Fallback redirect without session data
      window.top.location.href = `${window.location.origin}/subscription?step=completion&success=true`;
    }
  };
  
  // Effect to set up iframe message handling and breakout detection
  useEffect(() => {
    // Check URL for success or completion parameters
    const checkUrlForBreakout = () => {
      // Check current URL for success or completion parameters
      const currentUrl = window.location.href;
      if (currentUrl.includes('success=true') || currentUrl.includes('step=completion')) {
        handleSuccessfulPayment(currentUrl, new URLSearchParams(window.location.search).get('lpId'));
        return true;
      }
      return false;
    };
    
    // Check immediately
    if (checkUrlForBreakout()) return;
    
    // Check periodically 
    const intervalId = setInterval(checkUrlForBreakout, 1000);
    
    // Handle iframe messages for payment status
    const handleMessage = (event: MessageEvent) => {
      try {
        // Parse the data if it's a string
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Handle payment status messages from the iframe
        if (data.type === 'payment_status' || data.type === 'cardcom_redirect') {
          console.log('Received payment status/redirect message:', data);
          
          if (data.status === 'success' || data.success === true) {
            // Extract the lowProfileId if present
            const lpId = data.lowProfileId || 
              (data.url && new URL(data.url).searchParams.get('lpId'));
            
            // Handle successful payment
            handleSuccessfulPayment(data.url, lpId);
          } else if (data.status === 'error' || data.success === false) {
            console.error('Payment error:', data.error);
            toast.error('התשלום נכשל, אנא נסה שנית');
          }
        }
      } catch (error) {
        // Not our message or not JSON, ignore
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Inject breakout script into the iframe when it loads
    const injectIframeListener = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          setTimeout(() => {
            if (!iframeRef.current) return;
            
            const iframeDocument = iframeRef.current.contentDocument;
            if (iframeDocument && iframeDocument.body) {
              // Create a script element to inject into the iframe
              const script = document.createElement('script');
              script.innerHTML = getIframeBreakoutScript();
              iframeDocument.body.appendChild(script);
              console.log('Script injected into iframe');
            }
          }, 1000);
        } catch (error) {
          console.error('Error injecting script into iframe:', error);
        }
      }
    };
    
    // Try to inject the script on component mount
    injectIframeListener();
    
    // And also when iframe loads
    if (iframeRef.current) {
      iframeRef.current.onload = () => {
        console.log('Iframe loaded, injecting script');
        injectIframeListener();
      };
    }
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate]);
  
  return { handleSuccessfulPayment };
};
