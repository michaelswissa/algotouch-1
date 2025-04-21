
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
  
  // Determine operation type based on plan ID
  useEffect(() => {
    // Monthly plans need token creation
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
    operationType
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
    
    // Reset the payment process
    cleanupStatusCheck();
    
    // Reinitialize with a slight delay
    setTimeout(() => {
      initializePayment().then(data => {
        if (data) {
          console.log('Payment reinitialized successfully, starting status check');
          startStatusCheck(data.lowProfileCode, data.sessionId, operationType, planId);
        } else {
          // Handle initialization failure
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
    
    // Clean up any ongoing status checks
    cleanupStatusCheck();
    
    // Set state back to idle
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE
    }));
    
    toast.info('תהליך התשלום בוטל');
  }, [setState, cleanupStatusCheck]);

  const submitPayment = useCallback(() => {
    console.log('Submitting payment transaction');
    
    // Only send message if frame is ready
    if (masterFrameRef.current?.contentWindow) {
      try {
        // Get cardholder details from form fields or state
        const formData = {
          action: 'doTransaction',
          // Add required transaction parameters based on CardCom documentation
          TerminalNumber: state.terminalNumber,
          // Keep expirationMonth and expirationYear as they're set via postMessage separately
          numberOfPayments: "1",
          // Create a unique transaction ID based on timestamp to avoid duplicates
          ExternalUniqTranId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          // Important fields for 3DS flow
          ISOCoinId: 1, // ILS
          cardOwnerPhone: document.querySelector<HTMLInputElement>('#phone')?.value || '',
          cardOwnerEmail: document.querySelector<HTMLInputElement>('#email')?.value || '',
          cardOwnerName: document.querySelector<HTMLInputElement>('#cardholder-name')?.value || '',
          // Add operation type indicator
          Operation: operationType === 'token_only' || planId === 'monthly' 
            ? "ChargeAndCreateToken" 
            : "ChargeOnly"
        };

        console.log('Sending transaction data:', formData);
        masterFrameRef.current.contentWindow.postMessage(formData, '*');
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
        
        // Start monitoring the transaction status immediately
        if (state.lowProfileCode && state.sessionId) {
          console.log('Starting transaction status check');
          startStatusCheck(state.lowProfileCode, state.sessionId, operationType, planId);
        } else {
          console.error('Missing lowProfileCode or sessionId for status check');
        }
      } catch (error) {
        console.error("Error submitting payment:", error);
        handleError("שגיאה בשליחת פרטי התשלום");
      }
    } else {
      console.error("Master frame not available for transaction");
      handleError("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף ונסה שנית");
    }
  }, [masterFrameRef, setState, handleError, state.lowProfileCode, state.sessionId, state.terminalNumber, startStatusCheck, operationType, planId]);

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
          // Handle initialization failure
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
