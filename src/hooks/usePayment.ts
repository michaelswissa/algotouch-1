
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
  // Core refs and state
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  
  // State machine flags to prevent invalid transitions
  const isProcessingRef = useRef(false);
  const hasCompletedRef = useRef(false);
  
  // Determine operation type based on plan ID
  useEffect(() => {
    if (planId === 'monthly') {
      setOperationType('token_only');
    } else {
      setOperationType('payment');
    }
  }, [planId]);
  
  // Payment status management
  const {
    state,
    setState,
    handlePaymentSuccess,
    handleError
  } = usePaymentStatus({ onPaymentComplete });

  // Payment initialization
  const { initializePayment } = usePaymentInitialization({ 
    planId, 
    setState,
    masterFrameRef,
    operationType
  });

  // Payment status checking
  const paymentStatusCheck = usePaymentStatusCheck({ setState });
  const {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  } = paymentStatusCheck;

  // Set up message handling
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

  // Handle retry with robust cleanup
  const handleRetry = useCallback(async () => {
    console.log('Retrying payment initialization');
    
    // Prevent multiple retries
    if (isRetrying) {
      console.log('Retry already in progress, ignoring');
      return;
    }
    
    // Increment recovery attempts
    setRecoveryAttempts(prev => prev + 1);
    
    // If we've tried too many times, suggest page refresh
    if (recoveryAttempts >= 3) {
      toast.error('לא ניתן לאתחל מחדש את התשלום לאחר מספר ניסיונות, אנא רענן את העמוד ונסה שנית');
      return;
    }
    
    // Stop any pending status checks
    cleanupStatusCheck();
    
    // Mark that we're retrying
    setIsRetrying(true);
    setPaymentInProgress(false);
    
    // Reset form state
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
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (masterFrameRef.current) {
          // Add timestamp to prevent caching
          masterFrameRef.current.src = `${currentSrc}${currentSrc.includes('?') ? '&' : '?'}t=${Date.now()}`;
        }
      }
      
      // Wait for iframe reset
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize with retry flag
      const result = await initializePayment(true);
      
      if (result) {
        toast.info('מערכת התשלום אותחלה מחדש, אנא נסה שוב');
      } else {
        throw new Error('אתחול מחדש נכשל');
      }
    } catch (error) {
      console.error('Error during payment retry:', error);
      handleError("אירעה שגיאה בניסיון מחדש, אנא רענן את העמוד");
    } finally {
      setIsRetrying(false);
    }
  }, [initializePayment, setState, cleanupStatusCheck, handleError, isRetrying, recoveryAttempts]);

  // Submit payment with state machine validation
  const submitPayment = useCallback(() => {
    // Prevent invalid state transitions
    if (paymentInProgress || isRetrying) {
      console.log('Payment submission already in progress or retry in progress');
      return;
    }
    
    if (isProcessingRef.current || hasCompletedRef.current) {
      console.log('Invalid state transition: already processing or completed');
      return;
    }
    
    if (!state.lowProfileCode) {
      handleError("חסר מזהה יחודי לעסקה, אנא נסה/י שנית");
      return;
    }
    
    // Set processing state
    setPaymentInProgress(true);
    isProcessingRef.current = true;
    console.log('Submitting payment transaction');

    if (!masterFrameRef.current?.contentWindow) {
      handleError("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף ונסה שנית");
      setPaymentInProgress(false);
      isProcessingRef.current = false;
      return;
    }
    
    try {
      // Collect form data
      const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '';
      const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '';
      const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '';
      const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '';
      const expirationMonth = document.querySelector<HTMLSelectElement>('select[name="expirationMonth"]')?.value || '';
      const expirationYear = document.querySelector<HTMLSelectElement>('select[name="expirationYear"]')?.value || '';
      
      const currentOperationType = state.operationType || operationType;
      console.log('Current operation type:', currentOperationType);
      
      // Generate unique transaction ID with multiple entropy sources
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${expirationMonth}${expirationYear.substring(2)}`;
      
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
        ExternalUniqTranId: uniqueId,
        TerminalNumber: state.terminalNumber,
        // For monthly plan, we only create token without charging
        Operation: currentOperationType === 'token_only' ? "CreateTokenOnly" : "ChargeOnly",
        // Critical for CardCom - make sure both forms are included
        lowProfileCode: state.lowProfileCode,
        LowProfileCode: state.lowProfileCode
      };

      console.log('Sending transaction data to CardCom:', {
        ...formData,
        // Don't log certain sensitive fields
        cardOwnerId: '***********',
        ExternalUniqTranId: uniqueId.substring(0, 10) + '...',
      });
      
      // Send the data to the iframe
      masterFrameRef.current.contentWindow.postMessage(formData, '*');
      
      // Update state
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
      isProcessingRef.current = false;
    }
  }, [
    masterFrameRef, 
    state.terminalNumber, 
    state.lowProfileCode, 
    state.sessionId, 
    state.operationType, 
    handleError, 
    paymentInProgress, 
    setState, 
    startStatusCheck, 
    planId, 
    operationType, 
    isRetrying
  ]);

  // Mark completed when status becomes SUCCESS
  useEffect(() => {
    if (state.paymentStatus === PaymentStatus.SUCCESS) {
      hasCompletedRef.current = true;
      isProcessingRef.current = false;
    } else if (state.paymentStatus === PaymentStatus.FAILED) {
      isProcessingRef.current = false;
    }
  }, [state.paymentStatus]);

  return {
    ...state,
    operationType: state.operationType || operationType,
    masterFrameRef,
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId,
    initializePayment,
    handleRetry,
    submitPayment,
    isRetrying,
    paymentStatusCheck
  };
};
