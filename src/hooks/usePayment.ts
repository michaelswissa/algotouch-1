
import { useRef, useEffect, useCallback, useState } from 'react';
import { PaymentStatus, OperationType } from '@/components/payment/types/payment';
import { usePaymentStatus } from './payment/usePaymentStatus';
import { usePaymentInitialization } from './payment/usePaymentInitialization';
import { usePaymentStatusCheck } from './payment/usePaymentStatusCheck';
import { useFrameMessages } from './payment/useFrameMessages';
import { useCardcomInitializer } from './payment/useCardcomInitializer';
import { toast } from 'sonner';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePayment = ({ planId, onPaymentComplete }: UsePaymentProps) => {
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const { initializeCardcomFields } = useCardcomInitializer();
  
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

  // Listen for frame messages
  useFrameMessages({
    handlePaymentSuccess,
    setState,
    checkPaymentStatus,
    lowProfileId: state.lowProfileId,
    sessionId: state.sessionId,
    operationType,
    planType: planId
  });

  // Initialize CardCom fields when payment data is ready
  useEffect(() => {
    const initializeFields = async () => {
      if (
        state.lowProfileId && 
        state.sessionId && 
        state.terminalNumber && 
        masterFrameRef.current &&
        state.paymentStatus !== PaymentStatus.PROCESSING &&
        state.paymentStatus !== PaymentStatus.SUCCESS &&
        state.paymentStatus !== PaymentStatus.FAILED
      ) {
        console.log("Initializing CardCom fields with available data");
        
        try {
          const initialized = await initializeCardcomFields(
            masterFrameRef,
            state.lowProfileId,
            state.sessionId,
            state.terminalNumber,
            operationType
          );
          
          if (initialized) {
            console.log("CardCom fields initialized successfully");
            setState(prev => ({ ...prev, isFramesReady: true }));
          } else {
            console.error("Failed to initialize CardCom fields");
            setState(prev => ({ ...prev, isFramesReady: false }));
          }
        } catch (error) {
          console.error("Error during CardCom initialization:", error);
          handleError("שגיאה באתחול שדות התשלום");
        }
      }
    };

    initializeFields();
  }, [state.lowProfileId, state.sessionId, state.terminalNumber, operationType, setState, handleError]);

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
      paymentStatus: PaymentStatus.IDLE
    }));
    initializePayment();
  }, [initializePayment, setState]);

  const submitPayment = useCallback(() => {
    if (paymentInProgress) {
      console.log('Payment submission already in progress');
      return;
    }
    
    if (!state.lowProfileId) {
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
      
      // CardCom requires "lowProfileId" param for each doTransaction
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
        Operation: getOperationType(operationType, planId),
        lowProfileId: state.lowProfileId, // Ensure using consistent name
      };

      console.log('Sending transaction data to CardCom:', formData);
      masterFrameRef.current.contentWindow.postMessage(formData, 'https://secure.cardcom.solutions');
      
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.PROCESSING
      }));
      
      // Start status check with required params
      startStatusCheck(state.lowProfileId, state.sessionId, operationType, planId);
      
      setTimeout(() => {
        setPaymentInProgress(false);
      }, 5000);
    } catch (error) {
      console.error("Error submitting payment:", error);
      handleError("שגיאה בשליחת פרטי התשלום");
      setPaymentInProgress(false);
    }
  }, [state.lowProfileId, state.terminalNumber, state.sessionId, handleError, operationType, paymentInProgress, setState, startStatusCheck, planId]);

  // Helper to determine the correct operation type based on plan and payment type
  const getOperationType = (operationType: 'payment' | 'token_only', planId: string): OperationType => {
    if (operationType === 'token_only') {
      return 'CreateTokenOnly';
    } else if (planId === 'annual') {
      return 'ChargeAndCreateToken';
    } else {
      return 'ChargeOnly';
    }
  };

  return {
    ...state,
    operationType,
    masterFrameRef,
    lowProfileId: state.lowProfileId,
    sessionId: state.sessionId,
    initializePayment,
    handleRetry,
    submitPayment
  };
};
