
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
    handlePaymentSuccess: handlePaymentSuccess,
    setState,
    checkPaymentStatus,
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId
  });

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);

  const handleRetry = () => {
    console.log('Retrying payment initialization');
    
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE,
      sessionId: '',
      lowProfileCode: ''
    }));
    
    setTimeout(() => {
      initializePayment().then(data => {
        if (data) {
          console.log('Payment reinitialized successfully, starting status check');
          startStatusCheck(data.lowProfileCode, data.sessionId);
        }
      });
    }, 500);
  };

  const submitPayment = () => {
    console.log('Submitting payment transaction');
    
    // Only send message if frame is ready
    if (masterFrameRef.current?.contentWindow) {
      // Format follows the example from the CardCom example files
      masterFrameRef.current.contentWindow.postMessage(
        { action: 'doTransaction' },
        '*'
      );
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
    } else {
      console.error("Master frame not available for transaction");
      handleError("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף ונסה שנית");
    }
  };

  return {
    ...state,
    masterFrameRef,
    initializePayment: () => {
      console.log('Initializing payment with plan:', planId);
      
      initializePayment().then(data => {
        if (data) {
          console.log('Payment initialized successfully, starting status check');
          startStatusCheck(data.lowProfileCode, data.sessionId);
        }
      });
    },
    handleRetry,
    submitPayment
  };
};
