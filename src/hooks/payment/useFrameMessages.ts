import { useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UseFrameMessagesProps {
  handlePaymentSuccess: () => void;
  setState: (updater: any) => void;
  checkPaymentStatus: (lowProfileCode: string, sessionId: string, operationType?: 'payment' | 'token_only', planType?: string) => void;
  lowProfileId?:     string;
  lowProfileCode?:   string;
  sessionId:         string;
  operationType?:    'payment' | 'token_only';
  planType?:         string;
}

export const useFrameMessages = ({
  handlePaymentSuccess,
  setState,
  checkPaymentStatus,
  lowProfileId,
  lowProfileCode,
  sessionId,
  operationType = 'payment',
  planType
}: UseFrameMessagesProps) => {
  useEffect(() => {
    const profileCode = lowProfileId || lowProfileCode;
    
    if (!profileCode || !sessionId) return;

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
          
          if (message.data?.IsSuccess) {
            console.log('Payment submission successful');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
            handlePaymentSuccess();
          } else {
            console.error('Payment submission failed:', message.data?.Description);
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
            toast.error(message.data?.Description || 'שגיאה בביצוע התשלום');
          }
          return;
        }

        // Handle HandleError (error case)
        if (message.action === 'HandleError' || message.action === 'HandleEror') {
          console.error('Payment error:', message.message || 'Unknown error');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          
          // Show more specific error messages
          if (message.message && message.message.includes('lowProfileCode')) {
            toast.error('פרמטר lowProfileCode חובה');
          } else if (message.message && message.message.includes('תאריך תוקף שגוי')) {
            toast.error('תאריך תוקף שגוי');
          } else if (message.message && message.message.includes('CardComCardNumber')) {
            toast.error('שגיאת מפתח: נא לוודא הימצאות iframes בשם \'CardComCardNumber\' ו- \'CardComCvv\'');
          } else {
            toast.error(message.message || 'אירעה שגיאה בביצוע התשלום');
          }
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
          if (profileCode && sessionId) {
            checkPaymentStatus(profileCode, sessionId, operationType, planType);
          }
          return;
        }

        // Handle validations
        if (message.action === 'handleValidations') {
          console.log('Validation message for field:', message.field);
          // Field validation is handled separately in usePaymentValidation
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
  }, [lowProfileId, lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType, planType]);
};
