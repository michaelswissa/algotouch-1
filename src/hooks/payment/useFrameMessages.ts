
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UseFrameMessagesProps {
  handlePaymentSuccess: (transactionId: string, tokenId?: string) => void;
  setState: (updater: any) => void;
  checkPaymentStatus: (lowProfileCode: string, sessionId: string, operationType?: 'payment' | 'token_only', planType?: string) => Promise<void>;
  lowProfileCode: string;
  sessionId: string;
  operationType?: 'payment' | 'token_only';
  planType?: string;
}

export const useFrameMessages = ({
  handlePaymentSuccess,
  setState,
  checkPaymentStatus,
  lowProfileCode,
  sessionId,
  operationType,
  planType,
}: UseFrameMessagesProps) => {
  useEffect(() => {
    if (!lowProfileCode || !sessionId) return;

    const handleMessage = async (event: MessageEvent) => {
      try {
        const data = event.data;

        if (!data || typeof data !== 'object') {
          return; // Not our message
        }

        console.log('Received message from iframe:', data);

        // Handle 3DS messages
        if (data.action === '3DSProcessStarted') {
          console.log('3DS authentication process started');
          setState((prev: any) => ({
            ...prev,
            is3DSInProgress: true
          }));
        } else if (data.action === '3DSProcessCompleted') {
          console.log('3DS authentication process completed');
          setState((prev: any) => ({
            ...prev,
            is3DSInProgress: false
          }));
          
          // Check payment status after 3DS completes
          await checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
        }

        // Handle validation messages
        else if (data.action === 'handleValidations') {
          console.log('Field validation:', { field: data.field, isValid: data.isValid });
          
          if (data.field && data.isValid === false && data.message) {
            // Show validation errors as toast messages
            toast.error(data.message);
          }
        }

        // Handle submission result
        else if (data.action === 'HandleSubmit') {
          console.log('Payment form submitted successfully:', data.data);
          
          // Explicitly trigger status check after form submission
          await checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
        }

        // Handle token creation
        else if (data.action === 'tokenCreationStarted') {
          console.log('Token creation started');
          setState((prev: any) => ({
            ...prev,
            isTokenCreationInProgress: true
          }));
        } else if (data.action === 'tokenCreationCompleted') {
          console.log('Token creation completed:', data.data);
          setState((prev: any) => ({
            ...prev,
            isTokenCreationInProgress: false
          }));
          
          // For monthly plan, setup recurring after token creation
          if (operationType === 'token_only' && planType === 'monthly' && data.data?.token) {
            try {
              const { data: recurringData, error: recurringError } = await supabase.functions.invoke('cardcom-recurring', {
                body: {
                  action: 'setup',
                  token: data.data.token,
                  planType: 'monthly',
                  tokenExpiryDate: data.data.tokenExpiryDate,
                  lastFourDigits: data.data.lastFourDigits
                }
              });
              
              if (recurringError) {
                console.error('Error setting up recurring payment:', recurringError);
                toast.error('שגיאה בהגדרת תשלום מחזורי');
              } else {
                console.log('Monthly recurring payment setup successful:', recurringData);
              }
            } catch (error) {
              console.error('Exception setting up recurring payment:', error);
            }
          }
          
          // Check payment status after token creation
          await checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
        }

        // Handle errors
        else if (data.action === 'HandleError') {
          console.error('Payment error received:', data.message);
          toast.error(data.message || 'שגיאה בתהליך התשלום');
          
          setState((prev: any) => ({
            ...prev,
            paymentStatus: PaymentStatus.FAILED,
            isSubmitting: false
          }));
        }

      } catch (error) {
        console.error('Error handling iframe message:', error);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType, planType]);
};
