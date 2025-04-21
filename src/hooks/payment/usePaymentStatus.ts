
import { useState } from 'react';
import { PaymentState, PaymentStatus } from '@/components/payment/types/payment';
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
  });

  // Handle successful payment completion
  const handlePaymentSuccess = () => {
    console.log('Payment successful - transitioning to SUCCESS state');
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
    toast.success('התשלום בוצע בהצלחה!');
    
    // Delay callback to allow the UI to update
    setTimeout(() => {
      console.log('Executing payment complete callback');
      onPaymentComplete();
    }, 1500);
  };

  // Handle payment error with message
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
