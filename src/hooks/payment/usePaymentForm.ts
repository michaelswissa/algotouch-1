
import { useState, useEffect, useRef } from 'react';
import { usePayment } from '@/hooks/usePayment';
import { toast } from 'sonner';
import { getSubscriptionPlans } from '@/components/payment/utils/paymentHelpers';
import { PaymentStatus } from '@/components/payment/types/payment';
import { useCardcomInitializer } from '@/hooks/useCardcomInitializer';

interface UsePaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePaymentForm = ({ planId, onPaymentComplete }: UsePaymentFormProps) => {
  const [isMasterFrameLoaded, setIsMasterFrameLoaded] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
  const [initSent, setInitSent] = useState(false);
  const initAttemptedRef = useRef(false);
  const { initializeCardcomFields } = useCardcomInitializer();

  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' ? planDetails.annual :
               planId === 'vip' ? planDetails.vip :
               planDetails.monthly;

  const {
    terminalNumber,
    cardcomUrl,
    paymentStatus,
    masterFrameRef,
    operationType,
    isSubmitting,
    initializePayment,
    handleRetry,
    submitPayment,
    lowProfileCode,
    sessionId
  } = usePayment({
    planId,
    onPaymentComplete
  });

  const handleMasterFrameLoad = () => {
    console.log('💡 Master frame loaded');
    setIsMasterFrameLoaded(true);
  };

  // Only initialize once all required data is available
  const canInitialize = 
    isMasterFrameLoaded && 
    lowProfileCode && 
    sessionId && 
    terminalNumber && 
    !initSent && 
    !initAttemptedRef.current;

  useEffect(() => {
    if (!canInitialize) return;
    
    // Prevent multiple initialization attempts
    initAttemptedRef.current = true;
    setInitSent(true);
    
    console.log('Initializing CardCom fields with lowProfileCode:', lowProfileCode);
    
    // Wait a short tick to ensure the master frame's JS is ready
    setTimeout(() => {
      initializeCardcomFields(
        masterFrameRef,
        lowProfileCode!,
        sessionId!,
        terminalNumber!.toString(),
        operationType,
      ).then((success) => {
        if (success) {
          console.log('CardCom initialization completed successfully');
          setIsContentReady(true);
        } else {
          toast.error('שגיאה באתחול שדות התשלום');
          console.error('CardCom initialization failed');
          
          // Reset for retry
          setInitSent(false);
          setTimeout(() => {
            initAttemptedRef.current = false;
          }, 1000);
        }
      });
    }, 100);
  }, [canInitialize, masterFrameRef, lowProfileCode, sessionId, terminalNumber, operationType, initializeCardcomFields]);

  // Fallback in case master frame doesn't trigger onLoad
  useEffect(() => {
    const t = setTimeout(() => {
      if (!isMasterFrameLoaded && masterFrameRef.current) {
        console.warn('Master frame onLoad did not fire – checking readyState');
        
        if (masterFrameRef.current.contentWindow?.document?.readyState === 'complete') {
          console.log('Master frame is already loaded based on readyState');
          setIsMasterFrameLoaded(true);
        }
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [isMasterFrameLoaded, masterFrameRef]);

  return {
    isSubmitting,
    isInitializing: paymentStatus === PaymentStatus.INITIALIZING,
    isContentReady, // Using this flag to indicate when fields are ready to render
    isMasterFrameLoaded,
    plan,
    terminalNumber,
    cardcomUrl,
    paymentStatus,
    masterFrameRef,
    operationType,
    handleRetry,
    handleSubmitPayment: submitPayment,
    handleMasterFrameLoad,
  };
};
