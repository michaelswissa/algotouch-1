
import { useEffect } from 'react';
import { CardComMessage } from '@/components/payment/types/payment';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UseFrameMessagesProps {
  handlePaymentSuccess: () => void;
  setState: (updater: any) => void;
  checkPaymentStatus: (lowProfileCode: string, sessionId: string) => void;
  lowProfileCode: string;
  sessionId: string;
}

export const useFrameMessages = ({
  handlePaymentSuccess,
  setState,
  checkPaymentStatus,
  lowProfileCode,
  sessionId
}: UseFrameMessagesProps) => {
  useEffect(() => {
    if (!lowProfileCode || !sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        // Validate the source of the message for security
        // Note: In production, you should validate the origin
        
        const message = event.data;
        console.log('Received message from iframe:', message);

        if (!message || typeof message !== 'object' || !message.action) {
          return;
        }

        switch (message.action) {
          case 'HandleSubmit':
            console.log('HandleSubmit message:', message);
            if (message.data?.IsSuccess) {
              // Payment was successful
              handlePaymentSuccess();
            } else {
              // Payment failed
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
              toast.error(message.data?.Description || 'שגיאה בביצוע התשלום');
            }
            break;

          case 'HandleEror': // Note: This is the correct spelling from the example
            console.error('Payment error:', message);
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
            toast.error(message.message || 'שגיאה בביצוע התשלום');
            break;

          case 'handleValidations':
            // Handle field validations as shown in the example
            if (message.field === 'cardNumber') {
              console.log('Card number validation:', message.isValid);
            } else if (message.field === 'cvv') {
              console.log('CVV validation:', message.isValid);
            } else if (message.field === 'reCaptcha') {
              console.log('reCaptcha validation:', message.isValid);
            }
            break;

          case '3DSProcessStarted':
            console.log('3DS Process Started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            break;
            
          case '3DSProcessCompleted':
            console.log('3DS Process Completed');
            // Wait for final HandleSubmit message for success/failure
            break;

          default:
            console.log('Unknown message action:', message.action);
        }
      } catch (error) {
        console.error('Error processing iframe message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus]);
};
