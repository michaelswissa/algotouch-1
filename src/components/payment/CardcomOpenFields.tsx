
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
  const [isLoading, setIsLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const { user } = useAuth();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
    const initializePayment = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Determine if we're in registration flow or normal authenticated flow
        const isRegistration = Boolean(registrationData && !user);
        
        // Get user details - either from authenticated user or registration data
        const userEmail = user?.email || registrationData?.email || '';
        const userName = user?.user_metadata?.first_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
          : (registrationData?.userData?.firstName 
            ? `${registrationData.userData.firstName} ${registrationData.userData.lastName || ''}`
            : '');

        console.log('Initializing Cardcom payment with:', { 
          isRegistration, 
          planId,
          userName
        });

        // Call the edge function to get payment configuration
        const { data, error: funcError } = await supabase.functions.invoke('cardcom-openfields', {
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

        if (funcError) {
          throw new Error(`Error initializing payment: ${funcError.message}`);
        }

        if (!data || !data.success || !data.url) {
          throw new Error('Invalid response from payment service');
        }

        console.log('Successfully got Cardcom payment URL:', data.url);
        setPaymentUrl(data.url);
        setLowProfileId(data.lowProfileId);
        setIsLoading(false);

      } catch (error: any) {
        console.error('Error initializing payment:', error);
        setError(error.message || 'שגיאה בהתחברות למערכת התשלומים');
        setIsLoading(false);
        onError(error.message || 'שגיאה בהתחברות למערכת התשלומים');
      }
    };

    initializePayment();
  }, [planId, planName, amount, user, registrationData, onError]);

  // Function to check transaction status using Edge Function
  const checkTransactionStatus = async () => {
    if (!lowProfileId) return;
    
    setIsCheckingStatus(true);
    
    try {
      // Use fetch directly to call the backend (similar to example.js)
      const response = await fetch(`${window.location.origin}/functions/cardcom-check-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lowProfileId }),
      });

      if (!response.ok) {
        throw new Error(`Error checking status: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('Transaction status check result:', data);
      
      // Check if transaction was successful
      if (data.ResponseCode === 0 && data.TranzactionId) {
        onSuccess(data.TranzactionId.toString());
      }
    } catch (error: any) {
      console.error('Error checking transaction status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Add handlers for different states
  const handleRetry = () => {
    window.location.reload();
  };
  
  const handleOpenPaymentPage = () => {
    if (!paymentUrl) return;
    setIsProcessing(true);
    window.open(paymentUrl, '_blank');
    
    // Start checking the status periodically
    const checkInterval = setInterval(() => {
      checkTransactionStatus();
    }, 5000); // Check every 5 seconds
    
    // Stop checking after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      setIsProcessing(false);
    }, 5 * 60 * 1000);
  };

  // Handle success/error from URL params after redirection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const errorParam = urlParams.get('error');
    
    if (success === 'true') {
      // Transaction was successful, check for transaction ID
      checkTransactionStatus();
    } else if (errorParam === 'true') {
      setError('התשלום נכשל, אנא נסה שנית');
      onError('התשלום נכשל, אנא נסה שנית');
    }
  }, []);

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <div className="flex space-x-4 justify-center">
          <Button onClick={handleRetry}>נסה שנית</Button>
          <Button variant="outline" onClick={onCancel}>בחר אמצעי תשלום אחר</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-md overflow-hidden" dir="rtl">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <div>טוען את טופס התשלום...</div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold mb-4">פרטי תשלום</h3>
            
            <div className="text-center">
              <p className="mb-4">לחץ על הכפתור למטה כדי לפתוח את עמוד התשלום המאובטח.</p>
              
              <Button 
                onClick={handleOpenPaymentPage}
                disabled={isProcessing || isCheckingStatus}
                className="w-full"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4" />
                    מעבד תשלום...
                  </span>
                ) : planId === 'monthly' ? 
                  'התחל תקופת ניסיון חינם' : 
                  'המשך לתשלום מאובטח'
                }
              </Button>
              
              {isCheckingStatus && (
                <div className="mt-4 flex flex-col items-center">
                  <Spinner className="h-4 w-4" />
                  <p className="text-sm mt-2">בודק את סטטוס העסקה...</p>
                </div>
              )}
              
              {isProcessing && (
                <p className="text-sm mt-2">
                  לאחר השלמת התשלום, תועבר אוטומטית לדף הבא.
                </p>
              )}
              
              <div className="text-xs text-center text-gray-500 mt-4">
                העסקאות מאובטחות ע"י אישורית זהב
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CardcomOpenFields;
