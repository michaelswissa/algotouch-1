
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
    // Skip if no lowProfileCode or sessionId is available yet
    if (!lowProfileCode || !sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      // Accept messages from any origin as shown in the examples
      try {
        const message = event.data;
        console.log('Message from CardCom:', message);

        // Handle different CardCom messages based on the examples
        if (message && typeof message === 'object' && 'action' in message) {
          switch (message.action) {
            case 'HandleSubmit':
              console.log('Payment submitted from iframe:', message);
              
              // Check if the payment was successful
              if (message.data?.IsSuccess) {
                handlePaymentSuccess();
              } else {
                setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
                toast.error(message.data?.Description || 'אירעה שגיאה בעיבוד התשלום');
              }
              break;
              
            case 'HandleEror':
              console.error('Payment error from iframe:', message);
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
              toast.error(message.message || 'אירעה שגיאה בעיבוד התשלום');
              break;
              
            case 'handleValidations':
              // These are form validation messages, not critical errors
              console.log('Validation message:', message);
              break;
              
            default:
              console.log('Unknown message from CardCom:', message);
          }
        }
      } catch (error) {
        console.error('Error processing CardCom message:', error, event.data);
      }
    };

    // Add message listener
    window.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus]);
};
