
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
    
    // Force top redirection for any success or error URL parameters
    const checkForSuccessOrError = () => {
      const currentUrl = window.location.href;
      if (currentUrl.includes('success=true') || currentUrl.includes('error=true')) {
        console.log('Detected success/error params in iframe URL, redirecting top window');
        window.top.location.href = currentUrl; // Force top window redirection
      }
    };

    // Run check immediately and every 1 second
    checkForSuccessOrError();
    const intervalCheck = setInterval(checkForSuccessOrError, 1000);
    
    // Handle iframe messages for payment status
    const handleMessage = (event: MessageEvent) => {
      try {
        // First, let's try to parse the data if it's a string
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        console.log('Received message from iframe:', data);
        
        // Handle payment status messages from the iframe
        if (data.type === 'payment_status') {
          console.log('Received payment status from iframe:', data);
          
          if (data.status === 'success') {
            // Handle successful payment
            console.log('Payment successful in iframe, redirecting parent window');
            
            // If we have a lowProfileId, redirect to our success URL
            if (data.lowProfileId) {
              const baseUrl = `${window.location.origin}/subscription`;
              const redirectUrl = `${baseUrl}?step=completion&success=true&lpId=${data.lowProfileId}`;
              
              console.log('Redirecting to:', redirectUrl);
              window.top.location.href = redirectUrl; // Redirect the top window
            }
          } else if (data.status === 'error') {
            // Handle payment error
            console.error('Payment error in iframe:', data.error);
            
            // Redirect to error page
            const baseUrl = `${window.location.origin}/subscription`;
            window.top.location.href = `${baseUrl}?step=payment&error=true`;
          }
        } else if (data.type === 'cardcom_redirect') {
          // Handle redirection messages from the Cardcom iframe
          console.log('Received redirect instruction from Cardcom:', data);
          
          if (data.url) {
            console.log('Redirecting top window to:', data.url);
            window.top.location.href = data.url;
          }
        }
      } catch (error) {
        // Not our message or not JSON, ignore
        console.log('Error processing iframe message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Add a script to listen for navigation events inside the iframe
    const injectIframeListener = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          // Create a script element to inject into the iframe
          const script = document.createElement('script');
          script.innerHTML = `
            // Monitor URL changes in the iframe
            let lastUrl = window.location.href;
            
            // Check the URL immediately for any success/error parameters
            if (lastUrl.includes('success=true') || lastUrl.includes('error=true')) {
              console.log('Found success/error in iframe URL on load: ' + lastUrl);
              // Force redirection to the parent window
              window.parent.postMessage(JSON.stringify({
                type: 'cardcom_redirect',
                url: lastUrl,
                forceRedirect: true
              }), '*');
            }
            
            const observer = new MutationObserver(() => {
              if (window.location.href !== lastUrl) {
                const newUrl = window.location.href;
                lastUrl = newUrl;
                
                console.log('URL changed in iframe: ' + newUrl);
                
                // Check if this is a success or error redirect
                if (newUrl.includes('success=true')) {
                  console.log('Detected success=true in iframe URL');
                  // Extract the lowProfileId if present
                  const urlParams = new URLSearchParams(window.location.search);
                  const lpId = urlParams.get('lpId');
                  
                  // Send message to parent
                  window.parent.postMessage(JSON.stringify({
                    type: 'cardcom_redirect',
                    url: newUrl,
                    success: true,
                    forceRedirect: true,
                    lowProfileId: lpId
                  }), '*');
                  
                  // Also attempt a direct top window redirect
                  if (window.top) {
                    try {
                      window.top.location.href = newUrl + '&target=_top';
                    } catch(e) {
                      console.error('Failed to redirect top window', e);
                    }
                  }
                } else if (newUrl.includes('error=true')) {
                  console.log('Detected error=true in iframe URL');
                  // Send error message to parent
                  window.parent.postMessage(JSON.stringify({
                    type: 'cardcom_redirect',
                    url: newUrl,
                    success: false,
                    forceRedirect: true
                  }), '*');
                  
                  // Also attempt a direct top window redirect
                  if (window.top) {
                    try {
                      window.top.location.href = newUrl + '&target=_top';
                    } catch(e) {
                      console.error('Failed to redirect top window', e);
                    }
                  }
                }
              }
            });
            
            // Start observing
            observer.observe(document, { subtree: true, childList: true });
            
            // Also listen for form submissions
            document.addEventListener('submit', (e) => {
              console.log('Form submitted in iframe');
              // Tell the parent window about the form submission
              window.parent.postMessage(JSON.stringify({
                type: 'form_submit'
              }), '*');
            });
          `;
          
          // Wait for iframe to load then inject the script
          iframeRef.current.onload = () => {
            try {
              const iframeDocument = iframeRef.current?.contentWindow?.document;
              if (iframeDocument && iframeDocument.body) {
                const scriptElement = iframeDocument.createElement('script');
                scriptElement.textContent = script.innerHTML;
                iframeDocument.body.appendChild(scriptElement);
                console.log('Script injected into iframe');
              }
            } catch (error) {
              console.error('Error injecting script into iframe:', error);
            }
          };
        } catch (error) {
          console.error('Error setting up iframe listener:', error);
        }
      }
    };
    
    // Try to inject the script
    if (iframeRef.current) {
      injectIframeListener();
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('message', handleMessage);
      clearInterval(intervalCheck);
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
