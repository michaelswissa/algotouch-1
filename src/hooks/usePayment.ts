
import { useRef, useEffect, useCallback, useState } from 'react';
import { PaymentStatusEnum } from '@/types/payment';
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
    checkPaymentStatus,
    startStatusCheck,
    cleanupStatusCheck,
    isChecking
  } = usePaymentStatusCheck({ 
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId,
    setState,
    onPaymentSuccess: handlePaymentSuccess
  });

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
    if (
      masterFrameRef.current && 
      state.lowProfileCode && 
      state.sessionId && 
      state.terminalNumber &&
      !isCardcomInitialized
    ) {
      console.log('Initializing CardCom fields');
      
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

  useEffect(() => {
    return () => {
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);

  const handleRetry = useCallback(() => {
    console.log('Retrying payment initialization');
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatusEnum.IDLE
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

    try {
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatusEnum.PROCESSING
      }));
      
      // Use the cardcom3DS global object to handle the payment
      if (window.cardcom3DS) {
        console.log('Using CardCom 3DS to process payment', { lowProfileCode: state.lowProfileCode });
        
        // Validate fields first
        const isValid = window.cardcom3DS.validateFields();
        
        if (isValid) {
          // Process the payment using the cardcom3DS global object
          window.cardcom3DS.doPayment(state.lowProfileCode);
          console.log('Payment request sent to CardCom 3DS');
          
          // Start checking payment status
          startStatusCheck(state.lowProfileCode, state.sessionId, operationType, planId);
        } else {
          console.error('CardCom 3DS field validation failed');
          handleError("אנא וודא שפרטי כרטיס האשראי הוזנו כראוי");
          setState(prev => ({ ...prev, paymentStatus: PaymentStatusEnum.IDLE }));
        }
      } else {
        console.error('CardCom 3DS script not available');
        handleError("שגיאה בטעינת מערכת הסליקה, אנא רענן את הדף ונסה שנית");
        setState(prev => ({ ...prev, paymentStatus: PaymentStatusEnum.FAILED }));
      }
      
      setTimeout(() => {
        setPaymentInProgress(false);
      }, 5000);
    } catch (error) {
      console.error("Error submitting payment:", error);
      handleError("שגיאה בשליחת פרטי התשלום");
      setPaymentInProgress(false);
      setState(prev => ({ ...prev, paymentStatus: PaymentStatusEnum.FAILED }));
    }
  }, [
    state.lowProfileCode, 
    state.sessionId, 
    handleError, 
    operationType, 
    paymentInProgress, 
    setState, 
    startStatusCheck, 
    planId,
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
