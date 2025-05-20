
import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { PaymentLogger } from '@/services/logging/paymentLogger';
import { useAuth } from '@/contexts/auth';

export function usePaymentInitialization(
  selectedPlan: string,
  onPaymentComplete: () => void,
  onBack: () => void,
  setGlobalLoading: (isLoading: boolean) => void
) {
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const { user } = useAuth();

  const initiateCardcomPayment = async () => {
    setIsLoading(true);
    setGlobalLoading(true);
    setError('');
    setErrorCode('');
    setErrorDetails('');
    
    try {
      PaymentLogger.info(
        'Initiating Cardcom payment', 
        'payment-init', 
        { plan: selectedPlan, isAuthenticated: !!user, userId: user?.id || 'guest' }
      );
      
      const sessionId = localStorage.getItem('current_payment_session') || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Call the cardcom-payment edge function to create a payment URL
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: { plan: selectedPlan, sessionId }
      });

      if (error) {
        console.error('Error calling cardcom-payment function:', error);
        setError('שגיאה בהכנת עמוד התשלום');
        setErrorCode('SERVER_ERROR');
        setErrorDetails(error.message);
        PaymentLogger.error(
          'Error calling cardcom-payment function', 
          'payment-init', 
          { error: error.message, plan: selectedPlan }
        );
        return;
      }

      if (!data.success || !data.url) {
        console.error('Cardcom payment initialization failed:', data.error);
        setError(data.error || 'שגיאה בהכנת עמוד התשלום');
        setErrorCode(data.errorCode || 'PAYMENT_INIT_ERROR');
        setErrorDetails(data.errorDetails || 'לא התקבלה כתובת תקינה מהשרת');
        
        if (data.transactionId) {
          setTransactionId(data.transactionId);
        }
        
        PaymentLogger.error(
          'Cardcom payment initialization failed', 
          'payment-init', 
          { 
            error: data.error || 'URL generation failed', 
            errorCode: data.errorCode || 'PAYMENT_INIT_ERROR',
            plan: selectedPlan
          }
        );
        return;
      }

      PaymentLogger.info(
        'Successfully generated payment URL', 
        'payment-init', 
        { 
          plan: selectedPlan,
          hasLowProfileId: !!data.lowProfileId,
          transactionId: data.transactionId || 'not-provided' 
        }
      );

      // Set the payment URL for the iframe
      setPaymentUrl(data.url);
      
      // If we have a transaction ID, save it
      if (data.transactionId) {
        setTransactionId(data.transactionId);
      }

    } catch (error: any) {
      console.error('Exception during payment initialization:', error);
      setError('שגיאה בהכנת עמוד התשלום');
      setErrorCode('EXCEPTION');
      setErrorDetails(error.message || 'שגיאת מערכת בלתי צפויה');
      
      PaymentLogger.error(
        'Exception during payment initialization', 
        'payment-init', 
        { 
          error: error.message || String(error),
          plan: selectedPlan,
          stack: error.stack 
        }
      );
    } finally {
      setIsLoading(false);
      setGlobalLoading(false);
    }
  };

  return { 
    paymentUrl, 
    initiateCardcomPayment, 
    isLoading, 
    error,
    errorCode,
    errorDetails,
    transactionId
  };
}
