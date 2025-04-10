
import React, { useState, useEffect, useRef } from 'react';
import { CardContent } from '@/components/ui/card';
import { Shield, ShieldCheck, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import getIframeBreakoutScript from './iframe/IframeBreakoutScript';
import { Spinner } from '@/components/ui/spinner';

interface PaymentIframeProps {
  paymentUrl: string | null;
}

const PaymentIframe: React.FC<PaymentIframeProps> = ({ paymentUrl }) => {
  const [iframeHeight, setIframeHeight] = useState(650);
  const [isProcessing, setIsProcessing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const breakoutAttempted = useRef(false);
  
  // Function to handle successful payment detection and breakout
  const handleSuccessfulPayment = (url?: string, lpId?: string) => {
    // Prevent duplicate breakout attempts
    if (breakoutAttempted.current) return;
    breakoutAttempted.current = true;
    
    console.log('Payment successful, breaking out of iframe and navigating', { url, lpId });
    
    // Show processing state in iframe
    setIsProcessing(true);
    
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
      urlParams.set('force_top', 'true'); // New parameter to ensure top-level handling
      urlParams.set('plan', parsedSession.selectedPlan || '');
      
      if (lpId) {
        urlParams.set('lpId', lpId);
      }
      
      // Complete URL for redirection
      const completeUrl = `/subscription?${urlParams.toString()}`;
      console.log('Navigating to:', completeUrl);
      
      // Multiple approaches to break out of iframe
      
      // Approach 1: Force redirect to break out of any potential iframe
      try {
        window.top.location.href = `${window.location.origin}${completeUrl}`;
      } catch (e) {
        console.error('Direct top location navigation error:', e);
      }
      
      // Approach 2: Use window.open with _top target
      try {
        window.open(`${window.location.origin}${completeUrl}`, '_top');
      } catch (e) {
        console.error('Window open navigation error:', e);
      }
      
      // Approach 3: React router navigation as fallback
      try {
        navigate(completeUrl, { replace: true });
      } catch (e) {
        console.error('React navigation error:', e);
      }
      
      toast.success('התשלום התקבל בהצלחה!');
    } catch (e) {
      console.error('Error updating session data:', e);
      // Fallback redirect without session data
      window.top.location.href = `${window.location.origin}/subscription?step=completion&success=true&force_top=true`;
    }
  };
  
  // Set up parent window listener for iframe breakout messages
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      try {
        // Parse the message data
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        console.log('Received message from iframe:', data);
        
        // Process specific message types
        if (data && data.type === 'cardcom_redirect' && data.success === true) {
          console.log('Received cardcom_redirect success message, breaking out of iframe');
          // Show processing state
          setIsProcessing(true);
          handleSuccessfulPayment(data.url, data.lowProfileId);
        }
        
        // Also detect payment submission events
        if (data && 
            (data.type === 'payment_submitted' || 
             data.status === 'processing' || 
             data.action === 'submit')) {
          console.log('Detected payment submission event');
          setIsProcessing(true);
        }
      } catch (err) {
        // Not our message or not JSON, ignore
      }
    };
    
    // Add message listener to parent window
    window.addEventListener('message', handleIframeMessage);
    
    // Clean up
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [navigate]);
  
  // Set up periodic iframe breakout check
  useEffect(() => {
    const checkUrlForBreakout = () => {
      // Check current URL for success or completion parameters
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const forceTop = urlParams.get('force_top');
      const lpId = urlParams.get('lpId');
      
      // If we have success=true and force_top=true, we should process the breakout
      if (success === 'true' && forceTop === 'true') {
        console.log('Detected success=true and force_top=true in URL, processing redirect');
        handleSuccessfulPayment(currentUrl, lpId || undefined);
        return true;
      }
      
      // Also check for completion step
      if (urlParams.get('step') === 'completion' && forceTop === 'true') {
        console.log('Detected completion step with force_top=true in URL');
        handleSuccessfulPayment(currentUrl, lpId || undefined);
        return true;
      }
      
      return false;
    };
    
    // Check immediately
    if (checkUrlForBreakout()) return;
    
    // Check periodically 
    const intervalId = setInterval(checkUrlForBreakout, 1000);
    return () => clearInterval(intervalId);
  }, [navigate]);
  
  useEffect(() => {
    // Handle responsive iframe height
    const handleResize = () => {
      setIframeHeight(window.innerWidth < 768 ? 700 : 650);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Force parent window navigation for any success or error URL parameters
    const checkForSuccessOrError = () => {
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const lpId = urlParams.get('lpId');
      
      if (success === 'true') {
        console.log('Success=true detected in URL, processing redirect');
        handleSuccessfulPayment(currentUrl, lpId || undefined);
      } else if (currentUrl.includes('error=true')) {
        toast.error('התשלום נכשל, אנא נסה שנית');
      }
    };

    // Run check immediately
    checkForSuccessOrError();
    
    // Modified script injection to detect form submissions as well
    const injectIframeListener = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          setTimeout(() => {
            if (!iframeRef.current) return;
            
            const iframeDocument = iframeRef.current.contentDocument;
            if (iframeDocument) {
              // Create a script element to inject into the iframe
              const script = document.createElement('script');
              script.innerHTML = getIframeBreakoutScript();
              
              // Add form submission listener
              const paymentFormScript = document.createElement('script');
              paymentFormScript.innerHTML = `
                // Find all forms in the document
                document.addEventListener('DOMContentLoaded', function() {
                  const forms = document.querySelectorAll('form');
                  forms.forEach(form => {
                    form.addEventListener('submit', function(e) {
                      console.log('Form submission detected');
                      
                      // Notify parent window about form submission
                      window.parent.postMessage(JSON.stringify({
                        type: 'payment_submitted',
                        status: 'processing',
                        action: 'submit'
                      }), '*');
                      
                      // If it's a payment form, show our own loading overlay
                      if (form.querySelector('input[name="cc-number"]') || 
                          form.querySelector('input[name="cardNumber"]') ||
                          form.querySelector('.payment-field')) {
                            
                        // Create loading overlay if not exists
                        let overlay = document.getElementById('payment-processing-overlay');
                        if (!overlay) {
                          overlay = document.createElement('div');
                          overlay.id = 'payment-processing-overlay';
                          overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.9); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center;';
                          
                          const spinner = document.createElement('div');
                          spinner.style.cssText = 'width: 48px; height: 48px; border: 4px solid rgba(0, 0, 0, 0.1); border-radius: 50%; border-top-color: #3b82f6; animation: spinner 1s linear infinite;';
                          
                          const message = document.createElement('div');
                          message.style.cssText = 'margin-top: 16px; font-size: 18px; color: #111827;';
                          message.innerText = 'מעבד תשלום...';
                          
                          overlay.appendChild(spinner);
                          overlay.appendChild(message);
                          
                          // Add keyframes for spinner animation
                          const style = document.createElement('style');
                          style.textContent = '@keyframes spinner { to { transform: rotate(360deg); } }';
                          document.head.appendChild(style);
                          
                          document.body.appendChild(overlay);
                        }
                      }
                    });
                  });
                  
                  // Also watch for click events on submit buttons
                  const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], .submit-button, .payment-button');
                  submitButtons.forEach(button => {
                    button.addEventListener('click', function() {
                      console.log('Submit button clicked');
                      window.parent.postMessage(JSON.stringify({
                        type: 'payment_submitted',
                        status: 'processing',
                        action: 'button_click'
                      }), '*');
                    });
                  });
                });
              `;
              
              iframeDocument.body.appendChild(script);
              iframeDocument.body.appendChild(paymentFormScript);
              console.log('Scripts injected into iframe');
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
      window.removeEventListener('resize', handleResize);
    };
  }, [navigate]);

  // Don't render if no URL is provided
  if (!paymentUrl) return null;

  // Enhance the payment URL with proper breakout parameters
  const enhancedUrl = new URL(paymentUrl);
  
  // Force target=_top and add breaking parameters
  enhancedUrl.searchParams.set('target', '_top');
  enhancedUrl.searchParams.set('iframe', '0');
  enhancedUrl.searchParams.set('PopUp', '0');
  enhancedUrl.searchParams.set('forceRedirect', 'true');

  // Modify success URL to ensure proper breakout
  const successUrl = enhancedUrl.searchParams.get('successRedirectUrl');
  if (successUrl) {
    try {
      const successUrlObj = new URL(successUrl);
      
      // Add essential parameters to ensure breakout works
      successUrlObj.searchParams.set('target', '_top');  
      successUrlObj.searchParams.set('success', 'true');
      successUrlObj.searchParams.set('step', 'completion');
      successUrlObj.searchParams.set('force_top', 'true');
      
      // Replace the success URL with our enhanced version
      enhancedUrl.searchParams.set('successRedirectUrl', successUrlObj.toString());
    } catch (e) {
      console.error('Error enhancing success URL:', e);
    }
  }

  return (
    <CardContent className="p-0">
      <div className="relative">
        {/* Payment form title */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">טופס תשלום מאובטח</h3>
          </div>
          
          {/* Security badges */}
          <div className="flex flex-wrap gap-3 items-center mb-2">
            <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs border border-green-200 dark:border-green-900/30">
              <ShieldCheck className="h-3 w-3" />
              <span>SSL מאובטח</span>
            </div>
            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-200 dark:border-blue-900/30">
              <CreditCard className="h-3 w-3" />
              <span>תשלום מוצפן</span>
            </div>
            <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-xs border border-purple-200 dark:border-purple-900/30">
              <ShieldCheck className="h-3 w-3" />
              <span>PCI DSS</span>
            </div>
          </div>
        </div>
        
        {/* Processing overlay - shown when payment is being processed */}
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center rounded-b-lg">
            <Spinner size="xl" className="mb-4" />
            <h3 className="text-xl font-medium mb-2">מעבד את התשלום...</h3>
            <p className="text-muted-foreground text-sm">אנא המתן, התשלום מעובד כעת</p>
          </div>
        )}
        
        {/* Enhanced iframe container with shadow and border */}
        <div className="relative bg-gradient-to-b from-primary/5 to-transparent p-4 sm:p-6">
          <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/5 pointer-events-none"></div>
            <iframe 
              ref={iframeRef}
              src={enhancedUrl.toString()}
              width="100%"
              height={iframeHeight}
              frameBorder="0"
              title="Payment Form"
              className="w-full"
              name="payment_iframe_window"
            />
          </div>
        </div>
      </div>
    </CardContent>
  );
};

export default PaymentIframe;
