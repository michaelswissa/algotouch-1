
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
    // Validate the origin for security
    if (!event.origin.includes('cardcom.solutions')) {
      console.log('Ignoring message from untrusted origin:', event.origin);
      return;
    }

    const msg = event.data as CardComMessage;
    console.log('Received message from CardCom iframe:', msg);

    try {
      switch (msg.action) {
        case 'HandleSubmit':
          console.log('Payment successful:', msg.data);
          handlePaymentSuccess(msg.data);
          break;
          
        case '3DSProcessStarted':
          console.log('3DS process started');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          break;
          
        case '3DSProcessCompleted':
          console.log('3DS process completed, checking payment status');
          // After 3DS is completed, check the payment status
          if (lowProfileCode && sessionId) {
            // Add slight delay to allow CardCom to process the payment
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId);
            }, 1500);
          } else {
            console.error('Missing lowProfileCode or sessionId for payment status check');
            toast.error('חסרים פרטים לבדיקת סטטוס התשלום');
          }
          break;
          
        case 'HandleError':
          console.error('Payment error from CardCom:', msg);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error(msg.message || 'אירעה שגיאה בעיבוד התשלום');
          break;
          
        case 'handleValidations':
          console.log('Field validation from CardCom:', msg);
          if (msg.field === 'cardNumber') {
            if (!msg.isValid && msg.message) {
              // Don't show toast for every validation error, but you could log it
              console.warn('Card validation error:', msg.message);
            } else if (msg.isValid && msg.cardType) {
              // Card type information can be used to show card brand logo
              console.log('Card type detected:', msg.cardType);
            }
          } else if (msg.field === 'cvv') {
            // CVV validation
            console.log('CVV validation:', msg.isValid);
          }
          break;
          
        default:
          console.log('Unhandled message from CardCom iframe:', msg);
          break;
      }
    } catch (error) {
      console.error('Error handling message from CardCom iframe:', error);
    }
  };

  useEffect(() => {
    console.log('Setting up message listener with:', { lowProfileCode, sessionId });
    
    // Set up the event listener
    window.addEventListener('message', handleFrameMessages);
    
    // Clean up on unmount
    return () => {
      console.log('Cleaning up message listener');
      window.removeEventListener('message', handleFrameMessages);
    };
  }, [lowProfileCode, sessionId]);

  return { handleFrameMessages };
};
