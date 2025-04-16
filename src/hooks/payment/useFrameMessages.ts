
import { useEffect } from 'react';
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
        // Validate message origin for security
        const isTrustedOrigin = event.origin.includes('cardcom.solutions');
        if (!isTrustedOrigin) {
          console.warn('Received message from untrusted origin:', event.origin);
          return;
        }

        const message = event.data;
        console.log('Received message from iframe:', message);

        if (!message || typeof message !== 'object') {
          return;
        }

        // Handle initialization success message
        if (message.action === 'initialized') {
          console.log('CardCom fields initialized successfully');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
          return;
        }

        // Handle initialization error
        if (message.action === 'initializationError') {
          console.error('CardCom initialization error:', message);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error('שגיאה באתחול טופס התשלום');
          return;
        }

        switch (message.action) {
          case 'HandleSubmit':
            console.log('HandleSubmit message:', message);
            if (message.data?.IsSuccess) {
              handlePaymentSuccess();
            } else {
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
              toast.error(message.data?.Description || 'שגיאה בביצוע התשלום');
            }
            break;

          case 'HandleEror': // This is the correct spelling from CardCom
            console.error('Payment error:', message);
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
            toast.error(message.message || 'שגיאה בביצוע התשלום');
            break;

          case '3DSProcessStarted':
            console.log('3DS Process Started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            break;
            
          case '3DSProcessCompleted':
            console.log('3DS Process Completed');
            // Now we need to explicitly check the payment status as 3DS completion doesn't guarantee success
            setTimeout(() => checkPaymentStatus(lowProfileCode, sessionId), 1000);
            break;

          case 'paymentStarted':
            console.log('Payment process started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            break;

          case 'paymentCompleted':
            console.log('Payment process completed');
            // Check status after completion
            checkPaymentStatus(lowProfileCode, sessionId);
            break;

          case 'transactionTimeout':
            console.log('Transaction timed out');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
            toast.error('פג תוקף העסקה, אנא נסה שנית');
            break;

          case 'handleValidations':
            if (message.field === 'cardNumber') {
              const iframe = document.getElementById('CardComCardNumber') as HTMLIFrameElement;
              if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({
                  action: message.isValid ? 'removeCardNumberFieldClass' : 'addCardNumberFieldClass',
                  className: 'invalid'
                }, '*');
              }
            } else if (message.field === 'cvv') {
              const iframe = document.getElementById('CardComCvv') as HTMLIFrameElement;
              if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({
                  action: message.isValid ? 'removeCvvFieldClass' : 'addCvvFieldClass',
                  className: 'invalid'
                }, '*');
              }
            }
            break;

          default:
            console.log('Unhandled message action:', message.action);
            break;
        }
      } catch (error) {
        console.error('Error processing iframe message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus]);
};
