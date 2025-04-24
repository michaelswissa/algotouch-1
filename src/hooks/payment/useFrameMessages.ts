
import { useEffect } from 'react';
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
    if (!lowProfileCode || !sessionId) {
      console.log('Missing required parameters for message handler:', { lowProfileCode, sessionId });
      return;
    }

    console.log('Setting up CardCom message handler with:', { 
      lowProfileCode: lowProfileCode.substring(0, 8) + '...',  // Log partial for security 
      sessionId: sessionId.substring(0, 8) + '...',            // Log partial for security
      operationType
    });

    // Set a 30-second timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setState((prev: any) => ({
        ...prev,
        paymentStatus: PaymentStatus.FAILED,
        isSubmitting: false
      }));
      toast.error('תגובת תשלום איטית מדי, אנא נסה שוב');
    }, 30000);

    const handleMessage = async (event: MessageEvent) => {
      try {
        // Verify origin - strict check for CardCom's domain
        if (event.origin !== 'https://secure.cardcom.solutions') {
          console.log('Ignored message from unauthorized origin:', event.origin);
          return;
        }
        
        console.log('Received message from CardCom:', event.data);

        const data = event.data;
        if (!data || typeof data !== 'object') return;

        // Handle initCompleted message
        if (data.action === 'initCompleted') {
          console.log('CardCom fields initialization completed');
          setState((prev: any) => ({
            ...prev,
            isContentReady: true
          }));
          return;
        }

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
            is3DSInProgress: false,
            isSubmitting: false
          }));
          await checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
        }

        // Handle validation messages
        else if (data.action === 'handleValidations') {
          console.log('Field validation:', { field: data.field, isValid: data.isValid });
          if (data.field && data.isValid === false && data.message) {
            toast.error(data.message);
          }
        }

        // Handle submission result
        else if (data.action === 'HandleSubmit') {
          console.log('Payment form submitted successfully:', data.data);
          clearTimeout(timeoutId);
          await checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
          setState((prev: any) => ({
            ...prev,
            isSubmitting: false
          }));
        }

        // Handle errors - fixed typo from 'HandleEror' to 'HandleError'
        else if (data.action === 'HandleError') {
          console.error('Payment error received:', data.message);
          clearTimeout(timeoutId);
          toast.error(data.message || 'שגיאה בתהליך התשלום');
          setState((prev: any) => ({
            ...prev,
            paymentStatus: PaymentStatus.FAILED,
            isSubmitting: false
          }));
        }

      } catch (error) {
        console.error('Error handling iframe message:', error);
        clearTimeout(timeoutId);
        setState((prev: any) => ({
          ...prev,
          paymentStatus: PaymentStatus.FAILED,
          isSubmitting: false
        }));
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
    };
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType, planType]);
};
