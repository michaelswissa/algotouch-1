
import { useState } from 'react';
import { PaymentState, PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusProps {
  onPaymentComplete: (transactionId?: string) => void;
}

export const usePaymentStatus = ({ onPaymentComplete }: UsePaymentStatusProps) => {
  const [state, setState] = useState<PaymentState>({
    terminalNumber: '',
    cardcomUrl: '',
    paymentStatus: PaymentStatus.IDLE,
    sessionId: '',
    lowProfileCode: '',
    transactionId: undefined,
    isFramesReady: false,
  });

  const handlePaymentSuccess = (transactionId?: string) => {
    console.log('Payment successful, transactionId:', transactionId);
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.SUCCESS,
      transactionId: transactionId || prev.transactionId
    }));
    toast.success('התשלום בוצע בהצלחה!');
    
    setTimeout(() => {
      onPaymentComplete(transactionId || state.transactionId);
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
