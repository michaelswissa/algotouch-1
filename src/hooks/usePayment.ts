
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

  // Fix: Update to match the type signature of each dependency
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

  // Fix: Ensure we're passing the correct handlePaymentSuccess that matches expected signature
  useFrameMessages({
    handlePaymentSuccess: () => handlePaymentSuccess(), // Changed to match the expected signature
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
      // Using the format from the example files
      masterFrameRef.current.contentWindow.postMessage(
        { action: 'doTransaction' },
        '*'
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
