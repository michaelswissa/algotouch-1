
import { useState, useCallback } from 'react';
import { PaymentStatus as PaymentStatusEnum } from '@/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusProps {
  onPaymentComplete?: () => void;
}

interface PaymentState {
  paymentStatus: keyof typeof PaymentStatusEnum;
  sessionId: string;
  lowProfileCode: string;
  terminalNumber: string;
  cardcomUrl: string;
  reference: string;
  operationType: 'payment' | 'token_only';
  error: string | null;
}

export const usePaymentStatus = ({ onPaymentComplete }: UsePaymentStatusProps = {}) => {
  const [state, setState] = useState<PaymentState>({
    paymentStatus: PaymentStatusEnum.IDLE,
    sessionId: '',
    lowProfileCode: '',
    terminalNumber: '',
    cardcomUrl: 'https://secure.cardcom.solutions',
    reference: '',
    operationType: 'payment',
    error: null
  });

  const handlePaymentSuccess = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatusEnum.SUCCESS 
    }));
    
    toast.success('התשלום בוצע בהצלחה!');
    
    if (onPaymentComplete) {
      onPaymentComplete();
    }
  }, [onPaymentComplete]);
  
  const handleError = useCallback((errorMessage: string) => {
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatusEnum.FAILED,
      error: errorMessage
    }));
    
    toast.error(errorMessage || 'אירעה שגיאה בתהליך התשלום');
  }, []);

  return {
    state,
    setState,
    handlePaymentSuccess,
    handleError
  };
};
