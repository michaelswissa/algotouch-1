
import { useState } from 'react';
import { PaymentStatusType, PaymentStatus } from '@/components/payment/utils/paymentHelpers';
import { toast } from 'sonner';

interface UsePaymentStatusProps {
  onPaymentComplete: () => void;
}

export const usePaymentStatus = ({ onPaymentComplete }: UsePaymentStatusProps) => {
  const [state, setState] = useState({
    terminalNumber: '',
    cardcomUrl: '',
    paymentStatus: PaymentStatus.IDLE as PaymentStatusType,
    sessionId: '',
    lowProfileCode: '',
  });

  const handlePaymentSuccess = (data: any) => {
    console.log('Payment successful:', data);
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
