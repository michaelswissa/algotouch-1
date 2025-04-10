
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { toast } from 'sonner';

interface CardcomOpenFieldsProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  planName,
  amount,
  onSuccess,
  onError,
  onCancel
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const { user } = useAuth();
  const [registrationData, setRegistrationData] = useState<any>(null);

  // Check for registration data in session storage on component mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        setRegistrationData(JSON.parse(storedData));
      } catch (error) {
        console.error('Error parsing registration data:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Initialize Cardcom iframe only once the component is mounted
    const initializeCardcomFrame = async () => {
      setIsLoading(true);

      try {
        // Determine if we're in registration flow or normal authenticated flow
        const isRegistration = Boolean(registrationData && !user);
        
        // Get user details - either from authenticated user or registration data
        const userEmail = user?.email || registrationData?.email || '';
        const userName = user?.user_metadata?.first_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
          : registrationData?.userData?.firstName 
            ? `${registrationData.userData.firstName} ${registrationData.userData.lastName || ''}`
            : '';

        console.log('Initializing Cardcom with:', { 
          isRegistration, 
          planId, 
          userEmail: userEmail.substring(0, 3) + '...',
          hasUserName: Boolean(userName) 
        });

        // Call the edge function to initialize the Cardcom session
        const { data, error } = await supabase.functions.invoke('cardcom-openfields', {
          body: {
            planId,
            planName,
            amount,
            userEmail,
            userName,
            isRegistration,
            registrationData: isRegistration ? registrationData : null
          }
        });

        if (error) {
          console.error('Error initializing Cardcom:', error);
          onError('שגיאה בהתחברות למערכת התשלומים');
          return;
        }

        if (!data?.lowProfileId) {
          console.error('Missing lowProfileId in response:', data);
          onError('שגיאה בהתחברות למערכת התשלומים');
          return;
        }

        setLowProfileId(data.lowProfileId);

        // Set up message listener for iframe communication
        const handleMessage = (event: MessageEvent) => {
          // Verify message source (only accept messages from Cardcom)
          if (!event.origin.includes('cardcom.solutions')) {
            return;
          }

          const message = event.data;

          if (message.action === 'HandleSubmit') {
            console.log('Payment success:', message.data);
            if (message.data?.IsSuccess) {
              const transactionId = message.data.InternalDealNumber || 'unknown';
              onSuccess(transactionId);
            } else {
              onError(message.data?.Description || 'שגיאה בביצוע התשלום');
            }
          } else if (message.action === 'HandleEror') {
            console.error('Payment error:', message);
            onError(message.message || 'שגיאה בביצוע התשלום');
          }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
      } catch (error) {
        console.error('Error initializing Cardcom iframe:', error);
        onError('שגיאה בהתחברות למערכת התשלומים');
      } finally {
        setIsLoading(false);
      }
    };

    initializeCardcomFrame();
  }, [planId, planName, amount, user, registrationData, onSuccess, onError]);

  // Load CSS into iframe when it's ready and lowProfileId is available
  useEffect(() => {
    if (!iframeRef.current || !lowProfileId) return;

    const loadIframeCSS = () => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;

      // Load CSS from the public directory
      fetch('/assets/styles/cardNumber.css')
        .then(response => response.text())
        .then(css => {
          // Send the CSS to the iframe
          iframe.contentWindow?.postMessage({
            action: 'init',
            cardFieldCSS: css,
            cvvFieldCSS: css,
            reCaptchaFieldCSS: css,
            placeholder: "1111-2222-3333-4444",
            cvvPlaceholder: "123",
            lowProfileCode: lowProfileId,
          }, '*');
        })
        .catch(err => {
          console.error('Error loading CSS:', err);
        });
    };

    // Try to load CSS immediately if iframe is ready
    loadIframeCSS();

    // Also set up a listener for iframe load event
    const handleIframeLoad = () => {
      loadIframeCSS();
    };

    iframeRef.current.addEventListener('load', handleIframeLoad);
    return () => {
      iframeRef.current?.removeEventListener('load', handleIframeLoad);
    };
  }, [lowProfileId]);

  return (
    <div className="relative rounded-md overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        id="CardComMasterFrame"
        src="https://secure.cardcom.solutions/OpenFields/WebPay.aspx"
        style={{ width: '100%', height: '600px', border: 'none' }}
        title="Cardcom Payment"
      />
    </div>
  );
};

export default CardcomOpenFields;
