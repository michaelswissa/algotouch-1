
import { useRef, useEffect, useCallback, useState } from 'react';
import { PaymentStatus } from '@/types/payment';
import { usePaymentStatus } from './payment/usePaymentStatus';
import { usePaymentInitialization } from './payment/usePaymentInitialization';
import { usePaymentStatusCheck } from './payment/usePaymentStatusCheck';
import { useFrameMessages } from './payment/useFrameMessages';
import { useCardcomInitializer } from './useCardcomInitializer';
import { toast } from 'sonner';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePayment = ({ planId, onPaymentComplete }: UsePaymentProps) => {
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [isCardcomInitialized, setIsCardcomInitialized] = useState(false);
  
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

  const { initializeCardcomFields } = useCardcomInitializer();

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

  // Initialize CardCom fields once we have the necessary data
  useEffect(() => {
    if (
      masterFrameRef.current && 
      state.lowProfileCode && 
      state.sessionId && 
      state.terminalNumber &&
      !isCardcomInitialized
    ) {
      console.log('Initializing CardCom fields');
      
      // Allow some time for the iframe to load before initializing
      const timer = setTimeout(async () => {
        try {
          const success = await initializeCardcomFields(
            masterFrameRef,
            state.lowProfileCode,
            state.sessionId,
            state.terminalNumber,
            operationType
          );
          
          if (success) {
            console.log('CardCom fields initialized successfully');
            setIsCardcomInitialized(true);
          } else {
            console.error('Failed to initialize CardCom fields');
            handleError('שגיאה באתחול שדות התשלום');
          }
        } catch (error) {
          console.error('Error initializing CardCom fields:', error);
          handleError('שגיאה באתחול שדות התשלום');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [masterFrameRef, state.lowProfileCode, state.sessionId, state.terminalNumber, isCardcomInitialized, operationType, initializeCardcomFields, handleError]);

  // Cleanup on unmount
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
    setIsCardcomInitialized(false);
    initializePayment();
  }, [initializePayment, setState]);

  const submitPayment = useCallback(() => {
    if (paymentInProgress) {
      console.log('Payment submission already in progress');
      return;
    }
    
    if (!state.lowProfileCode) {
      handleError("חסר מזהה יחודי לעסקה, אנא נסה/י שנית");
      return;
    }
    
    if (!isCardcomInitialized) {
      handleError("שדות התשלום לא אותחלו כראוי, אנא רענן/י את העמוד");
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
      
      const externalUniqTranId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
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
        TerminalNumber: state.terminalNumber,
        Operation: operationType === 'token_only' ? "ChargeAndCreateToken" : "ChargeOnly",
        lowProfileCode: state.lowProfileCode,
        LowProfileCode: state.lowProfileCode,
        Document: {
          Name: cardholderName || email,
          Email: email,
          TaxId: cardOwnerId,
          Phone: phone,
          DocumentTypeToCreate: "Receipt"
        }
      };

      console.log('Sending transaction data to CardCom:', formData);
      masterFrameRef.current.contentWindow.postMessage(formData, '*');
      
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
      handleError("שגיאה בשליחת פרטי התשלום");
      setPaymentInProgress(false);
    }
  }, [
    masterFrameRef, state.terminalNumber, state.lowProfileCode, state.sessionId, 
    handleError, operationType, paymentInProgress, setState, startStatusCheck, planId,
    isCardcomInitialized
  ]);

  return {
    ...state,
    operationType,
    masterFrameRef,
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId,
    initializePayment,
    handleRetry,
    submitPayment,
    isCardcomInitialized
  };
};
