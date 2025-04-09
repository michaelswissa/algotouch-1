
import React, { useState, useEffect, useRef } from 'react';
import { CardContent } from '@/components/ui/card';
import { Shield, ShieldCheck, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PaymentIframeProps {
  paymentUrl: string | null;
}

const PaymentIframe: React.FC<PaymentIframeProps> = ({ paymentUrl }) => {
  const [iframeHeight, setIframeHeight] = useState(650);
  const iframeRef = useRef<HTMLIFrameElement>(null);
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
  
  // Set up periodic iframe breakout check
  useEffect(() => {
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
    
    // Add a script to detect navigation events inside the iframe
    const injectIframeListener = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          setTimeout(() => {
            if (!iframeRef.current) return;
            
            const iframeDocument = iframeRef.current.contentDocument;
            if (iframeDocument) {
              // Create a script element to inject into the iframe
              const script = document.createElement('script');
              script.innerHTML = `
                // Monitor URL changes
                let lastUrl = window.location.href;
                console.log('Iframe URL monitor initialized:', lastUrl);
                
                // Success patterns to watch for
                const SUCCESS_PATTERNS = [
                  'success=true',
                  'step=completion',
                  'SuccessAndFailDealPage/Success.aspx',
                  'payment_success',
                  'transaction_completed',
                  'thank_you'
                ];
                
                // Check if URL contains any success pattern
                function containsSuccessPattern(url) {
                  return SUCCESS_PATTERNS.some(pattern => url.includes(pattern));
                }
                
                // Check URL immediately
                const checkUrl = (url) => {
                  if (containsSuccessPattern(url) || url.includes('success=true') || url.includes('error=true')) {
                    console.log('Found success/error in URL:', url);
                    
                    // Add target=_top if not present
                    const finalUrl = new URL(url);
                    finalUrl.searchParams.set('target', '_top');
                    finalUrl.searchParams.set('success', 'true'); // Force success flag
                    
                    // Extract the lowProfileId if present
                    const urlParams = new URLSearchParams(finalUrl.search);
                    const lpId = urlParams.get('lpId');
                    
                    // Send message to parent window
                    window.parent.postMessage(JSON.stringify({
                      type: 'cardcom_redirect',
                      url: finalUrl.toString(),
                      success: true,
                      forceRedirect: true,
                      lowProfileId: lpId
                    }), '*');
                    
                    // Try direct navigation to break out of iframe
                    try {
                      if (window.top && window !== window.top) {
                        window.top.location.href = finalUrl.toString();
                      }
                    } catch(e) {
                      console.error('Failed to redirect top window', e);
                      
                      // Try alternate approach to break out
                      const topUrl = window.location.origin + '/subscription?step=completion&success=true';
                      const link = document.createElement('a');
                      link.href = topUrl;
                      link.target = '_top'; 
                      link.click();
                    }
                    
                    return true;
                  }
                  return false;
                };
                
                // Check URL immediately
                checkUrl(lastUrl);
                
                // Function to handle URL changes
                function handleUrlChange(newUrl) {
                  console.log('URL changed in iframe:', newUrl);
                  checkUrl(newUrl);
                }
                
                // Observe DOM changes to detect navigation
                const observer = new MutationObserver(() => {
                  if (window.location.href !== lastUrl) {
                    const newUrl = window.location.href;
                    lastUrl = newUrl;
                    handleUrlChange(newUrl);
                  }
                });
                
                // Check URL every 500ms as a fallback
                setInterval(() => {
                  if (window.location.href !== lastUrl) {
                    const newUrl = window.location.href;
                    lastUrl = newUrl;
                    handleUrlChange(newUrl);
                  }
                  
                  // Also look for common success indicators in DOM
                  const successElements = [
                    document.querySelector('.payment-success'),
                    document.querySelector('.success-message'),
                    document.querySelector('[data-payment-status="success"]'),
                    document.querySelector('.transaction-approved'),
                    document.querySelector('.approved-transaction')
                  ];
                  
                  if (successElements.some(el => el !== null)) {
                    console.log('Success element found in DOM!');
                    // Force success redirect
                    const topUrl = window.location.origin + '/subscription?step=completion&success=true';
                    window.parent.postMessage(JSON.stringify({
                      type: 'cardcom_redirect',
                      url: topUrl,
                      success: true,
                      forceRedirect: true
                    }), '*');
                    
                    try {
                      window.top.location.href = topUrl;
                    } catch(e) {
                      console.error('Failed to redirect top window from success element', e);
                    }
                  }
                }, 500);
                
                // Start observing
                observer.observe(document, { subtree: true, childList: true });
              `;
              
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
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  // Don't render if no URL is provided
  if (!paymentUrl) return null;

  // Ensure target=_top is in the URL and add breaking parameters
  const enhancedUrl = new URL(paymentUrl);
  enhancedUrl.searchParams.set('target', '_top');
  enhancedUrl.searchParams.set('iframe', '0');
  enhancedUrl.searchParams.set('PopUp', '0');
  enhancedUrl.searchParams.set('forceRedirect', 'true');

  // Add success URL parameters for clearer processing
  const successUrl = enhancedUrl.searchParams.get('successRedirectUrl');
  if (successUrl) {
    try {
      const successUrlObj = new URL(successUrl);
      // Force these parameters in the success URL
      successUrlObj.searchParams.set('target', '_top');  
      successUrlObj.searchParams.set('success', 'true');
      successUrlObj.searchParams.set('step', 'completion');
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
              title="Cardcom Payment Form"
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
