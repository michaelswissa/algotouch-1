import { useRef, useEffect, useCallback, useState } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { usePaymentStatus } from './payment/usePaymentStatus';
import { usePaymentInitialization } from './payment/usePaymentInitialization';
import { usePaymentStatusCheck } from './payment/usePaymentStatusCheck';
import { useFrameMessages } from './payment/useFrameMessages';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePayment = ({ planId, onPaymentComplete }: UsePaymentProps) => {
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const { user } = useAuth();
  
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

  const handleRetry = useCallback(() => {
    console.log('Retrying payment initialization');
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE
    }));
    initializePayment();
  }, [initializePayment, setState]);

  const validateCardholderData = (formData: any) => {
    if (!formData.cardholderName?.trim()) {
      throw new Error('יש למלא את שם בעל הכרטיס');
    }
    if (!formData.cardOwnerId || !/^\d{9}$/.test(formData.cardOwnerId)) {
      throw new Error('יש למלא תעודת זהות תקינה - 9 ספרות');
    }
    if (!formData.email || !formData.email.includes('@')) {
      throw new Error('יש למלא כתובת דואר אלקטרוני תקינה');
    }
    if (!formData.phone || !/^05\d{8}$/.test(formData.phone)) {
      throw new Error('יש למלא מספר טלפון נייד תקין');
    }
    return true;
  };

  const submitPayment = useCallback(() => {
    if (paymentInProgress) {
      console.log('Payment submission already in progress');
      return;
    }
    
    if (!state.lowProfileCode) {
      handleError("חסר מזהה יחודי לעסקה, אנא נסה/י שנית");
      return;
    }
    
    setPaymentInProgress(true);
    console.log('Submitting payment transaction');

    if (!masterFrameRef.current?.contentWindow) {
      handleError("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף ונסה שנית");
      setPaymentInProgress(false);
      return;
    }
    
    try {
      const formData = {
        cardholderName: document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '',
        cardOwnerId: document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '',
        email: document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '',
        phone: document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '',
        expirationMonth: document.querySelector<HTMLSelectElement>('select[name="expirationMonth"]')?.value || '',
        expirationYear: document.querySelector<HTMLSelectElement>('select[name="expirationYear"]')?.value || ''
      };

      validateCardholderData(formData);
      
      const externalUniqTranId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const cardcomData = {
        action: 'doTransaction',
        cardOwnerName: formData.cardholderName,
        cardOwnerId: formData.cardOwnerId,
        cardOwnerEmail: formData.email,
        cardOwnerPhone: formData.phone,
        expirationMonth: formData.expirationMonth,
        expirationYear: formData.expirationYear,
        numberOfPayments: "1",
        ExternalUniqTranId: externalUniqTranId,
        TerminalNumber: state.terminalNumber,
        Operation: operationType === 'token_only' ? "CreateTokenOnly" : "ChargeOnly",
        lowProfileCode: state.lowProfileCode,
        LowProfileCode: state.lowProfileCode
      };

      console.log('Sending transaction data to CardCom:', { 
        ...cardcomData,
        operationType,
        isMonthlyPlan: planId === 'monthly'
      });
      
      masterFrameRef.current.contentWindow.postMessage(cardcomData, '*');
      
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.PROCESSING
      }));
      
      startStatusCheck(state.lowProfileCode, state.sessionId, operationType, planId);
      
      setTimeout(() => {
        setPaymentInProgress(false);
      }, 5000);
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error(error.message || "שגיאה בשליחת פרטי התשלום");
      setPaymentInProgress(false);
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.FAILED
      }));
    }
  }, [
    masterFrameRef, state.terminalNumber, state.lowProfileCode, state.sessionId,
    handleError, operationType, paymentInProgress, setState, startStatusCheck,
    planId, user?.id
  ]);

  return {
    ...state,
    operationType,
    masterFrameRef,
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId,
    initializePayment,
    handleRetry,
    submitPayment
  };
};
