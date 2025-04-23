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
            if (planType === 'monthly') {
              // For monthly plan, we only created a token here, so keep in processing state
              // until the webhook confirms the token was created
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
              // Start checking status to see if the webhook has processed the token
              checkPaymentStatus(lowProfileCode, sessionId, 'token_only', planType);
            } else {
              // For annual and VIP plans, this is the actual payment, so mark as success
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
              handlePaymentSuccess();
            }
          } else {
            console.error('Payment submission failed:', message.data?.Description);
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED, isSubmitting: false }));
            toast.error(message.data?.Description || 'שגיאה בביצוע התשלום');
          }
          return;
        }

        // Handle HandleError (error case)
        if (message.action === 'HandleError' || message.action === 'HandleEror') {
          console.error('Payment error:', message.message || 'Unknown error');
          setState(prev => ({ 
            ...prev, 
            paymentStatus: PaymentStatus.FAILED,
            isSubmitting: false
          }));
          
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

        // Handle token creation messages
        if (message.action === 'tokenCreationStarted') {
          console.log('Token creation started');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          return;
        }

        if (message.action === 'tokenCreationCompleted') {
          console.log('Token creation completed');
          // For monthly plan, we need to check if the token was created successfully
          if (planType === 'monthly') {
            // Start payment status check specifically for token operation
            if (lowProfileCode && sessionId) {
              checkPaymentStatus(lowProfileCode, sessionId, 'token_only', planType);
            }
          }
          return;
        }

        // Handle 3DS processing messages
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

        // Handle validations
        if (message.action === 'handleValidations') {
          console.log('Validation message for field:', message.field);
          // Field validation is handled separately in usePaymentValidation
          return;
        }
      } catch (error) {
        console.error('Error handling iframe message:', error);
        // Reset state on unexpected errors
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          isSubmitting: false
        }));
        toast.error('אירעה שגיאה בעיבוד התשלום');
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
