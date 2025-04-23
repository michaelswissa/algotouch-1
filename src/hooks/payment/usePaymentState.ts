
import { useState } from 'react';
import { PaymentState, PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStateProps {
  onPaymentComplete: () => void;
}

export const usePaymentState = ({ onPaymentComplete }: UsePaymentStateProps) => {
  const [state, setState] = useState<PaymentState>({
    terminalNumber: '',
    cardcomUrl: '',
    paymentStatus: PaymentStatus.IDLE,
    sessionId: '',
    lowProfileCode: '',
    isFramesReady: false,
    operationType: undefined
  });

  const handlePaymentSuccess = () => {
    console.log('Payment successful');
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
    
    if (state.operationType === 'token_only') {
      toast.success('המנוי הופעל בהצלחה! החיוב הראשון יתבצע בתום תקופת הניסיון.');
    } else {
      toast.success('התשלום בוצע בהצלחה!');
    }
    
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
