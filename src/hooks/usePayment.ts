
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
    // Monthly plans use token creation for free trial
    if (planId === 'monthly') {
      console.log('Setting operation type to token_only for monthly plan');
      setOperationType('token_only');
    } else {
      console.log('Setting operation type to payment for plan:', planId);
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

  // Set up message handlers for iframe communication
  useFrameMessages({
    handlePaymentSuccess: handlePaymentSuccess,
    setState,
    checkPaymentStatus,
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId,
    operationType,
    planType: planId // Explicitly pass planId as planType
  });

  // Clean up on unmount
  useEffect(() => {
    return () => {
      console.log('Payment component unmounting, cleaning up');
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);

  // Handle retry of payment
  const handleRetry = useCallback(() => {
    console.log('Retrying payment initialization');
    
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE,
      sessionId: '',
      lowProfileCode: '',
      errorMessage: undefined
    }));
    
    // Reset the payment process
    cleanupStatusCheck();
    
    // Reinitialize with a slight delay
    setTimeout(() => {
      initializePayment().then(data => {
        if (data) {
          console.log('Payment reinitialized successfully');
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

  // Handle cancellation of payment
  const handleCancel = useCallback(() => {
    console.log('User cancelled payment process');
    
    // Clean up any ongoing status checks
    cleanupStatusCheck();
    
    // Set state back to idle
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE,
      errorMessage: undefined
    }));
    
    toast.info('תהליך התשלום בוטל');
  }, [setState, cleanupStatusCheck]);

  // Handle payment submission
  const submitPayment = useCallback(() => {
    console.log('Submitting payment transaction for plan:', planId, 'with operation type:', operationType);
    
    // Only send message if frame is ready
    if (masterFrameRef.current?.contentWindow) {
      try {
        // Get cardholder details from form fields
        const cardholderName = document.querySelector<HTMLInputElement>('#cardholder-name')?.value || '';
        const email = document.querySelector<HTMLInputElement>('#email')?.value || '';
        const phone = document.querySelector<HTMLInputElement>('#phone')?.value || '';
        
        // Validate required fields
        if (!cardholderName) {
          toast.error('נא להזין שם בעל הכרטיס');
          return;
        }
        
        // Create unique transaction ID
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        const formData = {
          action: 'doTransaction',
          TerminalNumber: state.terminalNumber,
          numberOfPayments: "1",
          ExternalUniqTranId: uniqueId,
          ISOCoinId: 1, // ILS
          cardOwnerPhone: phone,
          cardOwnerEmail: email,
          cardOwnerName: cardholderName,
          // Add operation type indicator
          Operation: operationType === 'token_only' || planId === 'monthly' 
            ? "ChargeAndCreateToken" 
            : "ChargeOnly",
          // Add plan type for backend reference
          planType: planId
        };

        console.log('Sending transaction data to CardCom iframe:', {
          ...formData,
          sessionId: state.sessionId,
          lowProfileCode: state.lowProfileCode
        });
        
        masterFrameRef.current.contentWindow.postMessage(formData, '*');
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
        
        // Start monitoring transaction status
        if (state.lowProfileCode && state.sessionId) {
          console.log('Starting transaction status check');
          startStatusCheck(state.lowProfileCode, state.sessionId, operationType, planId);
        } else {
          console.error('Missing lowProfileCode or sessionId for status check');
          handleError('פרטי העסקה חסרים, אנא טען מחדש את הדף ונסה שנית');
        }
      } catch (error) {
        console.error("Error submitting payment:", error);
        handleError("שגיאה בשליחת פרטי התשלום");
      }
    } else {
      console.error("Master frame not available for transaction");
      handleError("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף");
    }
  }, [masterFrameRef, setState, handleError, state.lowProfileCode, state.sessionId, 
      state.terminalNumber, startStatusCheck, operationType, planId]);

  return {
    ...state,
    operationType,
    masterFrameRef,
    initializePayment: () => {
      console.log('Initializing payment with plan:', planId, 'operation type:', operationType);
      
      initializePayment().then(data => {
        if (data) {
          console.log('Payment initialized successfully');
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
