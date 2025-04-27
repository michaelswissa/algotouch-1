
import { useState } from 'react';
import { PaymentState, PaymentStatus, PaymentStatusType } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusProps {
  onPaymentComplete: () => void;
}

export const usePaymentStatus = ({ onPaymentComplete }: UsePaymentStatusProps) => {
  const [state, setState] = useState<PaymentState>({
    terminalNumber: '',
    cardcomUrl: '',
    paymentStatus: PaymentStatus.IDLE,
    sessionId: '',
    lowProfileCode: '',
    isFramesReady: false,
  });

  // Changed to match the expected signature (no parameters)
  const handlePaymentSuccess = () => {
    console.log('Payment successful');
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
    toast.success('התשלום בוצע בהצלחה!');
    
    // Save successful payment status to prevent duplicate payments
    if (state.lowProfileCode) {
      try {
        const paymentSession = {
          lowProfileCode: state.lowProfileCode,
          sessionId: state.sessionId,
          status: 'completed',
          timestamp: Date.now()
        };
        sessionStorage.setItem('payment_session', JSON.stringify(paymentSession));
      } catch (e) {
        console.error('Error saving payment session:', e);
      }
    }
    
    setTimeout(() => {
      onPaymentComplete();
    }, 1000);
  };

  const handleError = (message: string) => {
    console.error('Payment error:', message);
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
    toast.error(message || 'אירעה שגיאה בעיבוד התשלום');
    
    // Save failed payment status
    if (state.lowProfileCode) {
      try {
        const paymentSession = {
          lowProfileCode: state.lowProfileCode,
          sessionId: state.sessionId,
          status: 'failed',
          timestamp: Date.now()
        };
        sessionStorage.setItem('payment_session', JSON.stringify(paymentSession));
      } catch (e) {
        console.error('Error saving payment session:', e);
      }
    }
  };

  return {
    state,
    setState,
    handlePaymentSuccess,
    handleError
  };
};
