
import React, { useState, useEffect, useRef } from 'react';
import { CardContent } from '@/components/ui/card';
import { Shield, ShieldCheck, CreditCard } from 'lucide-react';

interface PaymentIframeProps {
  paymentUrl: string | null;
}

const PaymentIframe: React.FC<PaymentIframeProps> = ({ paymentUrl }) => {
  const [iframeHeight, setIframeHeight] = useState(650);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIframeHeight(700);
      } else {
        setIframeHeight(650);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Force parent window navigation for any success or error URL parameters
    const checkForSuccessOrError = () => {
      const currentUrl = window.location.href;
      if (currentUrl.includes('success=true') || currentUrl.includes('error=true')) {
        console.log('Detected success/error params in URL, processing redirect');
        
        // Only redirect if we're the top window (not inside iframe)
        if (window === window.top) {
          // Update subscription flow step in session storage
          const sessionData = sessionStorage.getItem('subscription_flow');
          if (sessionData) {
            try {
              const parsedSession = JSON.parse(sessionData);
              if (currentUrl.includes('success=true')) {
                parsedSession.step = 'completion';
              }
              sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
            } catch (e) {
              console.error('Error updating session data:', e);
            }
          }
        }
      }
    };

    // Run check immediately
    checkForSuccessOrError();
    
    // Handle iframe messages for payment status
    const handleMessage = (event: MessageEvent) => {
      try {
        // Parse the data if it's a string
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        console.log('Received message:', data);
        
        // Handle payment status messages from the iframe
        if (data.type === 'payment_status' || data.type === 'cardcom_redirect') {
          console.log('Received payment status/redirect message:', data);
          
          if (data.status === 'success' || data.success === true) {
            // Handle successful payment
            console.log('Payment successful, redirecting window');
            
            // Construct redirect URL
            let redirectUrl = data.url;
            if (!redirectUrl) {
              const baseUrl = `${window.location.origin}/subscription`;
              redirectUrl = `${baseUrl}?step=completion&success=true`;
              
              // Add lowProfileId if available
              if (data.lowProfileId) {
                redirectUrl += `&lpId=${data.lowProfileId}`;
              }
            }
            
            console.log('Redirecting to:', redirectUrl);
            
            // Update flow state before redirecting
            try {
              const sessionData = sessionStorage.getItem('subscription_flow');
              if (sessionData) {
                const parsedSession = JSON.parse(sessionData);
                parsedSession.step = 'completion';
                sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
              }
            } catch (e) {
              console.error('Error updating session data:', e);
            }
            
            // Redirect the top window
            window.top.location.href = redirectUrl;
          } else if (data.status === 'error' || data.success === false) {
            // Handle payment error
            console.error('Payment error:', data.error);
            
            // Redirect to error page
            const baseUrl = `${window.location.origin}/subscription`;
            window.top.location.href = `${baseUrl}?step=payment&error=true`;
          }
        }
      } catch (error) {
        // Not our message or not JSON, ignore
        console.log('Error processing message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Add a script to detect navigation events inside the iframe
    const injectIframeListener = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          const iframeDocument = iframeRef.current.contentDocument;
          if (iframeDocument) {
            // Create a script element to inject into the iframe
            const script = document.createElement('script');
            script.innerHTML = `
              // Monitor URL changes
              let lastUrl = window.location.href;
              
              // Check URL immediately
              if (lastUrl.includes('success=true') || lastUrl.includes('error=true')) {
                console.log('Found success/error in URL on load: ' + lastUrl);
                
                // Add target=_top if not present
                if (!lastUrl.includes('target=_top')) {
                  const url = new URL(lastUrl);
                  url.searchParams.set('target', '_top');
                  lastUrl = url.toString();
                }
                
                // Send message to parent window
                window.parent.postMessage(JSON.stringify({
                  type: 'cardcom_redirect',
                  url: lastUrl,
                  success: lastUrl.includes('success=true'),
                  forceRedirect: true
                }), '*');
                
                // Try direct navigation
                try {
                  if (window.top) {
                    window.top.location.href = lastUrl;
                  }
                } catch(e) {
                  console.error('Failed to redirect top window', e);
                }
              }
              
              // Observe DOM changes to detect navigation
              const observer = new MutationObserver(() => {
                if (window.location.href !== lastUrl) {
                  const newUrl = window.location.href;
                  lastUrl = newUrl;
                  
                  console.log('URL changed in iframe: ' + newUrl);
                  
                  if (newUrl.includes('success=true') || newUrl.includes('error=true')) {
                    console.log('Detected success/error in iframe URL');
                    
                    // Ensure URL has target=_top
                    let finalUrl = newUrl;
                    if (!finalUrl.includes('target=_top')) {
                      const url = new URL(finalUrl);
                      url.searchParams.set('target', '_top');
                      finalUrl = url.toString();
                    }
                    
                    // Extract the lowProfileId if present
                    const urlParams = new URLSearchParams(window.location.search);
                    const lpId = urlParams.get('lpId');
                    
                    // Send message to parent window
                    window.parent.postMessage(JSON.stringify({
                      type: 'cardcom_redirect',
                      url: finalUrl,
                      success: newUrl.includes('success=true'),
                      forceRedirect: true,
                      lowProfileId: lpId
                    }), '*');
                    
                    // Try direct top window redirect
                    try {
                      if (window.top) {
                        window.top.location.href = finalUrl;
                      }
                    } catch(e) {
                      console.error('Failed to redirect top window', e);
                    }
                  }
                }
              });
              
              // Start observing
              observer.observe(document, { subtree: true, childList: true });
              
              // Listen for form submissions
              document.addEventListener('submit', (e) => {
                console.log('Form submitted in iframe');
                window.parent.postMessage(JSON.stringify({
                  type: 'form_submit'
                }), '*');
              });
            `;
            
            iframeDocument.body.appendChild(script);
            console.log('Script injected into iframe');
          }
        } catch (error) {
          console.error('Error injecting script into iframe:', error);
          
          // Fallback method: Try to inject when iframe loads
          iframeRef.current.onload = () => {
            try {
              const iframeDoc = iframeRef.current?.contentWindow?.document;
              if (iframeDoc && iframeDoc.body) {
                const scriptEl = iframeDoc.createElement('script');
                scriptEl.textContent = `
                  console.log('Iframe observer initialized');
                  
                  // Check URL immediately
                  if (window.location.href.includes('success=true') || window.location.href.includes('error=true')) {
                    console.log('Success/error detected in URL: ' + window.location.href);
                    
                    // Send message to parent
                    window.parent.postMessage(JSON.stringify({
                      type: 'cardcom_redirect',
                      url: window.location.href,
                      success: window.location.href.includes('success=true'),
                      forceRedirect: true
                    }), '*');
                    
                    // Try to break out
                    if (window.top && window !== window.top) {
                      window.top.location.href = window.location.href;
                    }
                  }
                  
                  // Monitor URL changes
                  setInterval(function() {
                    const currentHref = window.location.href;
                    if (currentHref.includes('success=true') || currentHref.includes('error=true')) {
                      console.log('Success/error detected in URL: ' + currentHref);
                      
                      window.parent.postMessage(JSON.stringify({
                        type: 'cardcom_redirect',
                        url: currentHref,
                        success: currentHref.includes('success=true'),
                        forceRedirect: true
                      }), '*');
                      
                      if (window.top && window !== window.top) {
                        window.top.location.href = currentHref;
                      }
                    }
                  }, 500);
                `;
                iframeDoc.body.appendChild(scriptEl);
                console.log('Fallback script injected into iframe');
              }
            } catch (e) {
              console.error('Fallback script injection failed:', e);
            }
          };
        }
      }
    };
    
    // Try to inject the script
    if (iframeRef.current) {
      // Small delay to make sure iframe is loaded
      setTimeout(injectIframeListener, 1000);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!paymentUrl) return null;

  // Ensure target=_top is in the URL
  let updatedPaymentUrl = paymentUrl;
  if (!updatedPaymentUrl.includes('target=_top')) {
    updatedPaymentUrl = updatedPaymentUrl + (updatedPaymentUrl.includes('?') ? '&' : '?') + 'target=_top';
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
              src={updatedPaymentUrl}
              width="100%"
              height={iframeHeight}
              frameBorder="0"
              title="Cardcom Payment Form"
              className="w-full"
              onLoad={() => console.log('Payment iframe loaded')}
              name="payment_iframe_window"
            />
          </div>
        </div>
      </div>
    </CardContent>
  );
};

export default PaymentIframe;
