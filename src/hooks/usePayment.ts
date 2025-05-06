
import { useRef, useEffect, useCallback, useState } from 'react';
import { PaymentStatusEnum } from '@/types/payment';
import { usePaymentStatus } from './payment/usePaymentStatus';
import { usePaymentInitialization } from './payment/usePaymentInitialization';
import { usePaymentStatusCheck } from './payment/usePaymentStatusCheck';
import { useFrameMessages } from './payment/useFrameMessages';
import { useCardcomInitializer } from './useCardcomInitializer';
import { toast } from 'sonner';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePayment = ({ planId, onPaymentComplete }: UsePaymentProps) => {
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
      state.lowProfileCode && 
      state.sessionId && 
      state.terminalNumber &&
      !isCardcomInitialized
    ) {
      PaymentLogger.log('Initializing CardCom fields');
      
      const timer = setTimeout(async () => {
        try {
          const success = await initializeCardcomFields(
            state.lowProfileCode,
            state.sessionId,
            state.terminalNumber,
            operationType
          );
          
          if (success) {
            PaymentLogger.log('CardCom fields initialized successfully');
            setIsCardcomInitialized(true);
          } else {
            PaymentLogger.error('Failed to initialize CardCom fields');
            handleError('שגיאה באתחול שדות התשלום');
          }
        } catch (error) {
          PaymentLogger.error('Error initializing CardCom fields:', error);
          handleError('שגיאה באתחול שדות התשלום');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [state.lowProfileCode, state.sessionId, state.terminalNumber, isCardcomInitialized, operationType, initializeCardcomFields, handleError]);

  useEffect(() => {
    return () => {
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);

  const handleRetry = useCallback(() => {
    PaymentLogger.log('Retrying payment initialization');
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatusEnum.IDLE
    }));
    setIsCardcomInitialized(false);
    initializePayment();
  }, [initializePayment, setState]);

  const submitPayment = useCallback(() => {
    if (paymentInProgress) {
      PaymentLogger.log('Payment submission already in progress');
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
    PaymentLogger.log('Submitting payment transaction');

    try {
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatusEnum.PROCESSING
      }));
      
      // Use the cardcom3DS global object to handle the payment
      if (window.cardcom3DS) {
        PaymentLogger.log('Using CardCom 3DS to process payment', { lowProfileCode: state.lowProfileCode });
        
        // Validate fields first
        const isValid = window.cardcom3DS.validateFields();
        
        if (isValid) {
          // Process the payment using the cardcom3DS global object
          window.cardcom3DS.doPayment(state.lowProfileCode);
          PaymentLogger.log('Payment request sent to CardCom 3DS');
          
          // Start checking payment status
          startStatusCheck(state.lowProfileCode, state.sessionId, operationType, planId);
        } else {
          PaymentLogger.error('CardCom 3DS field validation failed');
          handleError("אנא וודא שפרטי כרטיס האשראי הוזנו כראוי");
          setState(prev => ({ ...prev, paymentStatus: PaymentStatusEnum.IDLE }));
        }
      } else {
        PaymentLogger.error('CardCom 3DS script not available');
        handleError("שגיאה בטעינת מערכת הסליקה, אנא רענן את הדף ונסה שנית");
        setState(prev => ({ ...prev, paymentStatus: PaymentStatusEnum.FAILED }));
      }
      
      setTimeout(() => {
        setPaymentInProgress(false);
      }, 5000);
    } catch (error) {
      PaymentLogger.error("Error submitting payment:", error);
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
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId,
    initializePayment,
    handleRetry,
    submitPayment,
    isCardcomInitialized
  };
};
