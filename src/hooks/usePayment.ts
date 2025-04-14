
import { useRef, useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { usePaymentStatus } from './payment/usePaymentStatus';
import { usePaymentInitialization } from './payment/usePaymentInitialization';
import { usePaymentStatusCheck } from './payment/usePaymentStatusCheck';
import { useFrameMessages } from './payment/useFrameMessages';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePayment = ({ planId, onPaymentComplete }: UsePaymentProps) => {
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  
  const {
    state,
    setState,
    handlePaymentSuccess,
    handleError
  } = usePaymentStatus({ onPaymentComplete });

  const { initializePayment } = usePaymentInitialization({ 
    planId, 
    setState,
    masterFrameRef
  });

  const {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  } = usePaymentStatusCheck({ setState });

  useFrameMessages({
    handlePaymentSuccess,
    setState,
    checkPaymentStatus,
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId
  });

  const handleRetry = () => {
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE,
      sessionId: '',
      lowProfileCode: ''
    }));
    
    setTimeout(() => {
      initializePayment().then(data => {
        if (data) {
          startStatusCheck(data.lowProfileCode, data.sessionId);
        }
      });
    }, 500);
  };

  const submitPayment = () => {
    // Only send message if frame is ready
    if (masterFrameRef.current?.contentWindow) {
      masterFrameRef.current.contentWindow.postMessage(
        { action: 'submitPayment' },
        'https://secure.cardcom.solutions'
      );
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
    }
  };

  return {
    ...state,
    masterFrameRef,
    initializePayment: () => {
      initializePayment().then(data => {
        if (data) {
          startStatusCheck(data.lowProfileCode, data.sessionId);
        }
      });
    },
    handleRetry,
    submitPayment
  };
};
