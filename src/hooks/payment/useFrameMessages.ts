
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
          
          if (message.data?.IsSuccess) {
            console.log('Payment submission successful');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            
            // Start checking payment status
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
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

        // Handle tokenization messages
        if (message.action === 'tokenCreationStarted') {
          console.log('Token creation started');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          return;
        }

        if (message.action === 'tokenCreationCompleted') {
          console.log('Token creation completed');
          // Continue checking status to confirm token was saved properly
          checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
          return;
        }

        // Handle 3DS processing status
        if (message.action === '3DSProcessStarted') {
          console.log('3DS process started');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          return;
        }

        if (message.action === '3DSProcessCompleted') {
          console.log('3DS process completed, checking payment status');
          checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
          return;
        }

        // Handle validation feedback
        if (message.action === 'handleValidations') {
          console.log('Validation message:', message);
          // Don't change the payment state for validation messages
          return;
        }
      } catch (error) {
        console.error('Error handling message from iframe:', error);
      }
    };

    // Add event listener for messages from iframe
    window.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [lowProfileCode, sessionId, handlePaymentSuccess, setState, checkPaymentStatus, operationType, planType]);
};
