
import { useRef, useEffect, useCallback, useState } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { usePaymentStatus } from './payment/usePaymentStatus';
import { usePaymentInitialization } from './payment/usePaymentInitialization';
import { usePaymentStatusCheck } from './payment/usePaymentStatusCheck';
import { useFrameMessages } from './payment/useFrameMessages';
import { toast } from 'sonner';
import { CARDCOM } from '@/config/cardcom';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePayment = ({ planId, onPaymentComplete }: UsePaymentProps) => {
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Determine operation type based on plan ID
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

  // Initialize payment when component mounts
  useEffect(() => {
    if (!state.lowProfileCode && paymentStatus !== PaymentStatus.INITIALIZING) {
      console.log('Auto-initializing payment');
      initializePayment();
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);

  const handleRetry = useCallback(() => {
    console.log('Retrying payment initialization');
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE,
      isSubmitting: false
    }));
    initializePayment();
  }, [initializePayment, setState]);

  const submitPayment = useCallback(() => {
    if (isSubmitting) {
      console.log('Payment submission already in progress');
      return;
    }
    
    if (!state.lowProfileCode) {
      handleError("חסר מזהה יחודי לעסקה, אנא נסה/י שנית");
      return;
    }
    
    setIsSubmitting(true);
    setState(prev => ({ ...prev, isSubmitting: true }));
    
    console.log('Submitting payment transaction', { 
      operationType, 
      planId,
      lowProfileCode: state.lowProfileCode,
      sessionId: state.sessionId
    });

    if (!masterFrameRef.current?.contentWindow) {
      handleError("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף ונסה שנית");
      setIsSubmitting(false);
      setState(prev => ({ ...prev, isSubmitting: false }));
      return;
    }
    
    try {
      const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '';
      const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '';
      const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '';
      const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '';
      const expirationMonth = document.querySelector<HTMLSelectElement>('select[name="expirationMonth"]')?.value || '';
      const expirationYear = document.querySelector<HTMLSelectElement>('select[name="expirationYear"]')?.value || '';
      
      // Determine operation based on plan type
      let operation: "ChargeOnly" | "ChargeAndCreateToken" | "CreateTokenOnly" = "ChargeOnly";
      if (planId === 'monthly') {
        operation = "CreateTokenOnly";
      } else if (planId === 'annual') {
        operation = "ChargeAndCreateToken";
      } else if (planId === 'vip') {
        operation = "ChargeOnly";
      }
      
      // External unique transaction ID to prevent duplicate transactions
      const externalUniqTranId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // CardCom requires "lowProfileCode" param for each doTransaction
      const formData = {
        action: 'doTransaction',
        cardOwnerName: cardholderName,
        cardOwnerId,
        cardOwnerEmail: email,
        cardOwnerPhone: phone,
        expirationMonth,
        expirationYear,
        numberOfPayments: "1",
        ExternalUniqTranId: externalUniqTranId,
        TerminalNumber: CARDCOM.TERMINAL_NUMBER,
        Operation: operation, 
        lowProfileCode: state.lowProfileCode,
        LowProfileCode: state.lowProfileCode,  // For extra compatibility
        sessionId: state.sessionId,
        ApiName: CARDCOM.API_NAME
      };

      console.log('Sending transaction data to CardCom:', formData);
      masterFrameRef.current.contentWindow.postMessage(formData, '*');
      
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.PROCESSING
      }));
      
      // Start status check with required params
      startStatusCheck(state.lowProfileCode, state.sessionId, operationType, planId);
      
      // Add a fallback timeout to reset submitting state if no response
      setTimeout(() => {
        // Only reset if still submitting - don't interfere with successful completions
        setState(prev => {
          if (prev.paymentStatus === PaymentStatus.PROCESSING) {
            return prev; // Don't change state if we're still processing
          }
          return { ...prev, isSubmitting: false };
        });
        setIsSubmitting(false);
      }, 30000); // 30 second timeout
      
    } catch (error) {
      console.error("Error submitting payment:", error);
      handleError("שגיאה בשליחת פרטי התשלום");
      setIsSubmitting(false);
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [
    masterFrameRef, 
    state.lowProfileCode, 
    state.sessionId, 
    handleError, 
    operationType, 
    isSubmitting, 
    setState, 
    startStatusCheck, 
    planId
  ]);

  const { paymentStatus } = state;

  return {
    ...state,
    operationType,
    masterFrameRef,
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId,
    isSubmitting,
    initializePayment,
    handleRetry,
    submitPayment
  };
};
