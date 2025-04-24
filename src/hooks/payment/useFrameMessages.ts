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
        // Strict origin checking
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
          console.log('HandleSubmit received, updating status to PROCESSING');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          
          // Start checking status with increased initial delay
          if (lowProfileCode && sessionId) {
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 8000); // Increased initial delay
          }
          return;
        }

        // Handle explicit success messages
        if (message.action === 'Success' || 
            (message.data && message.data.IsSuccess === true) || 
            (message.IsSuccess === true) ||
            (message.ResponseCode === 0) ||
            (message.data && message.data.ResponseCode === 0)) {
          console.log('Success message received');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
          handlePaymentSuccess();
          return;
        }

        // Handle HandleError (error case)
        if (message.action === 'HandleError' || message.action === 'HandleEror') {
          console.error('Payment error:', message.message || 'Unknown error');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          
          // Improved error messages in Hebrew
          const errorMessage = message.message || '';
          if (errorMessage.includes('lowProfileCode')) {
            toast.error('חסר מזהה עסקה');
          } else if (errorMessage.includes('תאריך תוקף שגוי')) {
            toast.error('תאריך תוקף הכרטיס שגוי');
          } else if (errorMessage.includes('CardComCardNumber')) {
            toast.error('שגיאה בפרטי כרטיס האשראי');
          } else {
            toast.error(message.message || 'אירעה שגיאה בביצוע התשלום');
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

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType, planType]);
};
