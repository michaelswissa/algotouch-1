
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
  const [isRetrying, setIsRetrying] = useState(false);
  
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
    operationType: state.operationType || operationType,
    planType: planId
  });

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);

  const handleRetry = useCallback(async () => {
    console.log('Retrying payment initialization');
    
    // Stop any pending status checks
    cleanupStatusCheck();
    
    // Mark that we're retrying
    setIsRetrying(true);
    setPaymentInProgress(false);
    
    // Reset form fields
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.INITIALIZING,
      isFramesReady: false,
      error: undefined
    }));
    
    try {
      // Force reload the master iframe to ensure clean state
      if (masterFrameRef.current) {
        const currentSrc = masterFrameRef.current.src;
        masterFrameRef.current.src = '';
        setTimeout(() => {
          if (masterFrameRef.current) {
            masterFrameRef.current.src = currentSrc + '?t=' + Date.now();
          }
        }, 100);
      }
      
      // Wait a moment for iframe reset
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize with retry flag
      await initializePayment(true);
      
      toast.info('מערכת התשלום אותחלה מחדש, אנא נסה שוב');
    } catch (error) {
      console.error('Error during payment retry:', error);
      handleError("אירעה שגיאה בניסיון מחדש, אנא רענן את העמוד");
    } finally {
      setIsRetrying(false);
    }
  }, [initializePayment, setState, cleanupStatusCheck, handleError]);

  const submitPayment = useCallback(() => {
    if (paymentInProgress || isRetrying) {
      console.log('Payment submission already in progress or retry in progress');
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
      const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '';
      const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '';
      const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '';
      const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '';
      const expirationMonth = document.querySelector<HTMLSelectElement>('select[name="expirationMonth"]')?.value || '';
      const expirationYear = document.querySelector<HTMLSelectElement>('select[name="expirationYear"]')?.value || '';
      
      const currentOperationType = state.operationType || operationType;
      console.log('Current operation type:', currentOperationType);
      
      // CardCom requires "lowProfileCode" param for each doTransaction
      const formData: any = {
        action: 'doTransaction',
        cardOwnerName: cardholderName,
        cardOwnerId,
        cardOwnerEmail: email,
        cardOwnerPhone: phone,
        expirationMonth,
        expirationYear,
        numberOfPayments: "1",
        ExternalUniqTranId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        TerminalNumber: state.terminalNumber,
        // For monthly plan, we only create token without charging
        Operation: currentOperationType === 'token_only' ? "CreateTokenOnly" : "ChargeOnly",
        // Critical for CardCom - make sure both forms are included
        lowProfileCode: state.lowProfileCode,
        LowProfileCode: state.lowProfileCode
      };

      console.log('Sending transaction data to CardCom:', formData);
      masterFrameRef.current.contentWindow.postMessage(formData, '*');
      
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.PROCESSING
      }));
      
      // Start status check with required params
      startStatusCheck(state.lowProfileCode, state.sessionId, currentOperationType, planId);
    } catch (error) {
      console.error("Error submitting payment:", error);
      handleError("שגיאה בשליחת פרטי התשלום");
      setPaymentInProgress(false);
    }
  }, [masterFrameRef, state.terminalNumber, state.lowProfileCode, state.sessionId, state.operationType, handleError, paymentInProgress, setState, startStatusCheck, planId, operationType, isRetrying]);

  return {
    ...state,
    operationType: state.operationType || operationType,
    masterFrameRef,
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId,
    initializePayment,
    handleRetry,
    submitPayment,
    isRetrying
  };
};
