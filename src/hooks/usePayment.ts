
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
      sessionId: '',
      lowProfileCode: ''
    }));
    
    cleanupStatusCheck();
    
    // Reinitialize with a slight delay - similar to example
    setTimeout(() => {
      initializePayment().then(data => {
        if (data) {
          console.log('Payment reinitialized successfully');
          startStatusCheck(data.lowProfileCode, data.sessionId, operationType, planId);
        } else {
          handleError('אתחול התשלום נכשל, אנא טען מחדש את הדף ונסה שנית');
        }
      }).catch(err => {
        console.error('Failed to reinitialize payment:', err);
        handleError('אירעה שגיאה באתחול התשלום');
      });
    }, 500);
  }, [initializePayment, setState, startStatusCheck, cleanupStatusCheck, handleError, operationType, planId]);

  const handleCancel = useCallback(() => {
    console.log('User cancelled payment process');
    
    cleanupStatusCheck();
    
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE
    }));
    
    toast.info('תהליך התשלום בוטל');
  }, [setState, cleanupStatusCheck]);

  const submitPayment = useCallback(() => {
    // Prevent double submission - common issue in the example
    if (paymentInProgress) {
      console.log('Payment submission already in progress, ignoring duplicate request');
      return;
    }
    
    setPaymentInProgress(true);
    console.log('Submitting payment transaction');
    
    if (!masterFrameRef.current?.contentWindow) {
      console.error("Master frame not available for transaction");
      handleError("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף ונסה שנית");
      setPaymentInProgress(false);
      return;
    }
    
    try {
      // Collect values directly - similar to example
      const cardholderName = document.querySelector<HTMLInputElement>('#cardholder-name')?.value || '';
      const email = document.querySelector<HTMLInputElement>('#email')?.value || '';
      const phone = document.querySelector<HTMLInputElement>('#phone')?.value || '';
      const expirationMonth = document.querySelector<HTMLSelectElement>('select[name="expiryMonth"]')?.value || '';
      const expirationYear = document.querySelector<HTMLSelectElement>('select[name="expiryYear"]')?.value || '';
      
      // Simplified form data similar to example
      const formData = {
        action: 'doTransaction',
        cardOwnerName: cardholderName,
        cardOwnerEmail: email,
        cardOwnerPhone: phone,
        expirationMonth,
        expirationYear,
        numberOfPayments: "1",
        // Create transaction ID from timestamp + random
        ExternalUniqTranId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        TerminalNumber: state.terminalNumber,
        // Set operation type based on plan - similar to example
        Operation: operationType === 'token_only' ? "ChargeAndCreateToken" : "ChargeOnly"
      };

      console.log('Sending transaction data to CardCom iframe');
      masterFrameRef.current.contentWindow.postMessage(formData, '*');
      
      // Update state to processing
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
      
      // Start status check - but rely more on iframe events like the example
      if (state.lowProfileCode && state.sessionId) {
        console.log('Starting transaction status check');
        startStatusCheck(state.lowProfileCode, state.sessionId, operationType, planId);
      } else {
        console.error('Missing lowProfileCode or sessionId for status check');
      }
      
      // Reset in-progress flag after a timeout to prevent UI getting stuck
      setTimeout(() => {
        setPaymentInProgress(false);
      }, 5000);
    } catch (error) {
      console.error("Error submitting payment:", error);
      handleError("שגיאה בשליחת פרטי התשלום");
      setPaymentInProgress(false);
    }
  }, [
    masterFrameRef, 
    setState, 
    handleError, 
    state.lowProfileCode, 
    state.sessionId, 
    state.terminalNumber, 
    startStatusCheck, 
    operationType, 
    planId,
    paymentInProgress
  ]);

  return {
    ...state,
    operationType,
    masterFrameRef,
    initializePayment: () => {
      console.log('Initializing payment with plan:', planId);
      
      initializePayment().then(data => {
        if (data) {
          console.log('Payment initialized successfully, starting status check');
          startStatusCheck(data.lowProfileCode, data.sessionId, operationType, planId);
        } else {
          handleError('אתחול התשלום נכשל, אנא טען מחדש את הדף ונסה שנית');
        }
      }).catch(err => {
        console.error('Failed to initialize payment:', err);
        handleError('אירעה שגיאה באתחול התשלום');
      });
    },
    handleRetry,
    handleCancel,
    submitPayment
  };
};
