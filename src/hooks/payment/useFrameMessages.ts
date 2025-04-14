
import { useEffect } from 'react';
import { PaymentStatus, CardComMessage } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UseFrameMessagesProps {
  handlePaymentSuccess: (data: any) => void;
  setState: (updater: any) => void;
  checkPaymentStatus: (lpCode: string, sId: string) => void;
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
  
  const handleFrameMessages = (event: MessageEvent) => {
    if (!event.origin.includes('cardcom.solutions')) {
      return;
    }

    const msg = event.data as CardComMessage;
    console.log('Received message from CardCom iframe:', msg);

    switch (msg.action) {
      case 'HandleSubmit':
        handlePaymentSuccess(msg.data);
        break;
      case '3DSProcessStarted':
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
        break;
      case '3DSProcessCompleted':
        checkPaymentStatus(lowProfileCode, sessionId);
        break;
      case 'HandleError':
        console.error('Payment error:', msg);
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        toast.error(msg.message || 'אירעה שגיאה בעיבוד התשלום');
        break;
      case 'handleValidations':
        if (msg.field === 'cardNumber') {
          if (!msg.isValid && msg.message) {
            toast.error(msg.message);
          }
        }
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleFrameMessages);
    return () => {
      window.removeEventListener('message', handleFrameMessages);
    };
  }, [lowProfileCode, sessionId]);

  return { handleFrameMessages };
};
