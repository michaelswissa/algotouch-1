
import { useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UseFrameMessagesProps {
  handlePaymentSuccess: () => void;
  setState: (updater: any) => void;
  checkPaymentStatus: (lowProfileCode: string, sessionId: string, operationType?: 'payment' | 'token_only', planType?: string) => void;
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
  operationType = 'payment',
  planType
}: UseFrameMessagesProps) => {
  useEffect(() => {
    if (!lowProfileCode || !sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        // Safety check for message origin
        if (!event.origin.includes('cardcom.solutions') && 
            !event.origin.includes('localhost') && 
            !event.origin.includes(window.location.origin)) {
          return;
        }

        const message = event.data;
        console.log('Received message from iframe:', message);

        if (!message || typeof message !== 'object') {
          return;
        }

        // Handle HandleSubmit (success case)
        if (message.action === 'HandleSubmit' || message.action === 'handleSubmit') {
          console.log('HandleSubmit message received:', message);
          
          // When the form has been submitted, we wait for the status check to confirm success
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          
          // Start checking status right away to detect success/failure
          if (lowProfileCode && sessionId) {
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
          }
          
          return;
        }

        // Handle explicit success messages
        if (message.action === 'Success' || 
            (message.data && message.data.IsSuccess === true) || 
            (message.IsSuccess === true)) {
          console.log('Explicit success message received');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
          handlePaymentSuccess();
          return;
        }

        // Handle HandleError (error case)
        if (message.action === 'HandleError' || message.action === 'HandleEror') {
          console.error('Payment error:', message.message || 'Unknown error');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          
          // Show more specific error messages
          if (message.message) {
            if (message.message.includes('lowProfileCode')) {
              toast.error('פרמטר lowProfileCode חובה');
            } else if (message.message.includes('תאריך תוקף שגוי')) {
              toast.error('תאריך תוקף שגוי');
            } else if (message.message.includes('CardComCardNumber')) {
              toast.error('שגיאת מפתח: נא לוודא הימצאות iframes בשם \'CardComCardNumber\' ו- \'CardComCvv\'');
            } else {
              toast.error(message.message);
            }
          } else {
            toast.error('אירעה שגיאה בביצוע התשלום');
          }
          return;
        }

        // Handle explicit failure messages
        if (message.action === 'Failure' || 
            (message.data && message.data.IsSuccess === false) ||
            (message.IsSuccess === false)) {
          console.error('Explicit failure message received');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error(message.message || message.data?.Description || 'התשלום נכשל');
          return;
        }

        // Handle processing start/complete
        if (message.action === '3DSProcessStarted') {
          console.log('3DS process started');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          return;
        }

        if (message.action === '3DSProcessCompleted') {
          console.log('3DS process completed');
          // Start status check to verify final result
          if (lowProfileCode && sessionId) {
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
          }
          return;
        }

        // Handle validation messages
        if (message.action === 'handleValidations') {
          console.log('Validation message for field:', message.field);
          // Field validation is handled separately in usePaymentValidation
          return;
        }
        
        // Handle redirect URLs
        if (message.action === 'redirect' && message.url) {
          console.log('Redirect message received:', message.url);
          // Don't redirect automatically, instead mark as processing and wait for status check
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          
          if (lowProfileCode && sessionId) {
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
          }
          return;
        }
      } catch (error) {
        console.error('Error handling iframe message:', error);
      }
    };

    console.log('Setting up message event listener for CardCom iframe');
    window.addEventListener('message', handleMessage);
    
    return () => {
      console.log('Removing message event listener for CardCom iframe');
      window.removeEventListener('message', handleMessage);
    };
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType, planType]);
};
