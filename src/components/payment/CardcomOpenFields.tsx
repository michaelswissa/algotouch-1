
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

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
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

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
      setError(null);

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
          userEmail: userEmail ? userEmail.substring(0, 3) + '...' : 'none',
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
          setError('שגיאה בהתחברות למערכת התשלומים: ' + error.message);
          onError('שגיאה בהתחברות למערכת התשלומים');
          return;
        }

        if (!data?.lowProfileId) {
          console.error('Missing lowProfileId in response:', data);
          setError('שגיאה בהתחברות למערכת התשלומים: חסר מזהה תשלום');
          onError('שגיאה בהתחברות למערכת התשלומים');
          return;
        }

        console.log('Successfully got lowProfileId:', data.lowProfileId);
        setLowProfileId(data.lowProfileId);

      } catch (error: any) {
        console.error('Error initializing Cardcom iframe:', error);
        setError(`שגיאה בהתחברות למערכת התשלומים: ${error.message}`);
        onError('שגיאה בהתחברות למערכת התשלומים');
      } finally {
        setIsLoading(false);
      }
    };

    initializeCardcomFrame();
  }, [planId, planName, amount, user, registrationData, onError, retryCount]);

  // Set up message listener for iframe communication
  useEffect(() => {
    if (!lowProfileId) return;
    
    const handleMessage = (event: MessageEvent) => {
      // Verify message source (only accept messages from Cardcom)
      if (!event.origin.includes('cardcom.solutions')) {
        return;
      }

      const message = event.data;
      console.log('Received message from Cardcom:', message);

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
  }, [lowProfileId, onSuccess, onError]);

  // Load iframe content when lowProfileId is available
  useEffect(() => {
    if (!iframeRef.current || !lowProfileId) return;

    // Set the iframe source directly to Cardcom's LowProfile page
    iframeRef.current.src = `https://secure.cardcom.solutions/External/lowProfileClearing/160138.aspx?LowProfileCode=${lowProfileId}`;
    
  }, [lowProfileId]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <div className="flex space-x-4 justify-center">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleRetry}
          >
            נסה שנית
          </button>
          <button 
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            onClick={onCancel}
          >
            בחר אמצעי תשלום אחר
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-md overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10 gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <div>טוען את טופס התשלום...</div>
        </div>
      )}
      
      {lowProfileId ? (
        <iframe
          ref={iframeRef}
          style={{ width: '100%', height: '600px', border: 'none' }}
          title="Cardcom Payment"
        />
      ) : !isLoading && (
        <div className="p-6 text-center">
          <div className="text-red-500 mb-4">לא ניתן לטעון את טופס התשלום</div>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleRetry}
          >
            נסה שנית
          </button>
        </div>
      )}
    </div>
  );
};

export default CardcomOpenFields;
