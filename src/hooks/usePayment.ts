import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { usePaymentState } from './payment/usePaymentState';
import { usePaymentInitialization } from './payment/usePaymentInitialization';
import { usePaymentStatusCheck } from './payment/usePaymentStatusCheck';
import { useFrameMessages } from './payment/useFrameMessages';
import { usePaymentSubmission } from './payment/usePaymentSubmission';
import { toast } from 'sonner';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePayment = ({ planId, onPaymentComplete }: UsePaymentProps) => {
  // Core refs and state
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
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
  } = usePaymentState({ onPaymentComplete });

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

  // Payment submission
  const { submitPayment } = usePaymentSubmission({
    masterFrameRef,
    state,
    setState,
    handleError,
    startStatusCheck,
    isRetrying,
    operationType
  });

  // Set up message handling
  useFrameMessages({
    handlePaymentSuccess,
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
