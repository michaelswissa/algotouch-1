import { useRef, useEffect, useCallback, useState } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { usePaymentStatus } from './payment/usePaymentStatus';
import { usePaymentInitialization } from './payment/usePaymentInitialization';
import { usePaymentStatusCheck } from './payment/usePaymentStatusCheck';
import { useFrameMessages } from './payment/useFrameMessages';
import { toast } from 'sonner';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePayment = ({ planId, onPaymentComplete }: UsePaymentProps) => {
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [frameKey, setFrameKey] = useState(Date.now());

  useEffect(() => {
    if (planId === 'monthly') {
      setOperationType('token_only');
    } else {
      setOperationType('payment');
    }
  }, [planId]);

  const {
    state,
    setState,
    handlePaymentSuccess,
    handleError
  } = usePaymentStatus({ onPaymentComplete });

  const { initializePayment } = usePaymentInitialization({
    planId,
    setState,
    masterFrameRef,
    operationType
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
    sessionId: state.sessionId,
    operationType,
    planType: planId
  });

  useEffect(() => {
    return () => {
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);

  const resetFrames = useCallback(() => {
    setFrameKey(Date.now());
    setTimeout(() => {
      if (masterFrameRef.current) {
        console.log('Forcing frame refresh');
        const src = masterFrameRef.current.src;
        masterFrameRef.current.src = '';
        setTimeout(() => {
          if (masterFrameRef.current) {
            masterFrameRef.current.src = src;
          }
        }, 50);
      }
    }, 50);
  }, []);

  const handleRetry = useCallback(() => {
    console.log('Retrying payment initialization');
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE
    }));
    resetFrames();
    
    setTimeout(() => {
      initializePayment();
    }, 300);
  }, [initializePayment, setState, resetFrames]);

  const submitPayment = useCallback(() => {
    if (paymentInProgress) {
      console.log('Payment submission already in progress');
      return;
    }

    if (!state.lowProfileCode) {
      console.error("Missing lowProfileCode for payment", state);
      handleError("שגיאת אתחול תשלום - חסר קוד פרופיל, נא לרענן ולנסות שנית");
      return;
    }

    if (!masterFrameRef.current?.contentWindow) {
      handleError("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף ונסה שנית");
      setPaymentInProgress(false);
      return;
    }

    setPaymentInProgress(true);
    console.log('Submitting payment transaction with lowProfileCode:', state.lowProfileCode);

    try {
      const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '';
      const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '';
      const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '';
      const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '';
      const expirationMonth = document.querySelector<HTMLSelectElement>('select[name="expirationMonth"]')?.value || '';
      const expirationYear = document.querySelector<HTMLSelectElement>('select[name="expirationYear"]')?.value || '';

      if (!cardholderName || !cardOwnerId || !email || !phone || !expirationMonth || !expirationYear) {
        console.error("Missing required fields for payment");
        toast.error('יש למלא את כל השדות המסומנים בכוכבית');
        setPaymentInProgress(false);
        return;
      }

      if (!state.lowProfileCode) {
        console.error("lowProfileCode missing before send");
        handleError("חסר קוד פרופיל נמוך (lowProfileCode)");
        setPaymentInProgress(false);
        return;
      }

      const formData = {
        action: 'doTransaction',
        cardOwnerName: cardholderName,
        cardOwnerId,
        cardOwnerEmail: email,
        cardOwnerPhone: phone,
        expirationMonth,
        expirationYear,
        numberOfPayments: "1",
        lowProfileCode: state.lowProfileCode,
        sessionId: state.sessionId,
        ExternalUniqTranId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        TerminalNumber: state.terminalNumber,
        Operation: operationType === 'token_only' ? "ChargeAndCreateToken" : "ChargeOnly"
      };

      console.log('Sending transaction data:', { 
        ...formData,
        lowProfileCode: formData.lowProfileCode,
        sessionId: formData.sessionId
      });

      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
      masterFrameRef.current.contentWindow.postMessage(formData, '*');

      startStatusCheck(state.lowProfileCode, state.sessionId, operationType, planId);

      setTimeout(() => {
        setPaymentInProgress(false);
      }, 5000);
    } catch (error) {
      console.error("Error submitting payment:", error);
      handleError("שגיאה בשליחת פרטי התשלום");
      setPaymentInProgress(false);
    }
  }, [masterFrameRef, state.terminalNumber, state.lowProfileCode, state.sessionId, handleError, operationType, paymentInProgress, planId, startStatusCheck, setState]);

  return {
    ...state,
    operationType,
    masterFrameRef,
    frameKey,
    initializePayment,
    handleRetry,
    submitPayment,
    resetFrames
  };
};
