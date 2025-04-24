
import { useState } from 'react';
import { PaymentState, PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusProps {
  onPaymentComplete: () => void;
}

export const usePaymentStatus = ({ onPaymentComplete }: UsePaymentStatusProps) => {
  const [state, setState] = useState<PaymentState>({
    paymentStatus: PaymentStatus.IDLE,
    lowProfileCode: '',
    sessionId: '',
    terminalNumber: '',
    cardcomUrl: '',
    isReady: false,
    is3DSInProgress: false
  });

  const handlePaymentSuccess = () => {
    console.log('Payment successful');
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
    toast.success('התשלום בוצע בהצלחה!');
    
    setTimeout(() => {
      onPaymentComplete();
    }, 1000);
  };

  const handleError = (message: string) => {
    console.error('Payment error:', message);
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
    toast.error(message || 'אירעה שגיאה בעיבוד התשלום');
  };

  return {
    state,
    setState,
    handlePaymentSuccess,
    handleError
  };
};
