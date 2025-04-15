
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
      // Only handle messages from CardCom domains
      if (!event.origin.includes('cardcom.solutions')) {
        return;
      }

      try {
        const message = event.data as CardComMessage;
        console.log('Message from CardCom:', message);

        // Handle different CardCom messages
        switch (message.action) {
          case 'HandleSubmit':
            console.log('Payment submitted from iframe');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            
            // Active check for payment status after a short delay
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId);
            }, 3000);
            break;
            
          case '3DSProcessStarted':
            console.log('3DS verification started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            break;
            
          case '3DSProcessCompleted':
            console.log('3DS verification completed');
            
            // Check if 3DS was successful
            if (message.data?.success) {
              // Don't set success state yet, wait for webhook confirmation
              setTimeout(() => {
                checkPaymentStatus(lowProfileCode, sessionId);
              }, 2000);
            } else {
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
              toast.error('אימות 3DS נכשל');
            }
            break;
            
          case 'HandleError':
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
