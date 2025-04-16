
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
        const message = event.data;
        console.log('Received message from iframe:', message);

        if (!message || typeof message !== 'object' || !message.action) {
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

          case 'HandleEror': // This is the correct spelling from the CardCom example
            console.error('Payment error:', message);
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
            toast.error(message.message || 'שגיאה בביצוע התשלום');
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

          case '3DSProcessStarted':
            console.log('3DS Process Started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            break;
            
          case '3DSProcessCompleted':
            console.log('3DS Process Completed');
            // Wait for final HandleSubmit message
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
