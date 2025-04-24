
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
  const [initFailed, setInitFailed] = useState(false);
  const initAttemptedRef = useRef(false);
  const initAttemptCount = useRef(0);
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

  // Handle field initialization when all dependencies are ready
  useEffect(() => {
    if (!canInitialize) return;
    
    // Prevent multiple initialization attempts in the same cycle
    initAttemptedRef.current = true;
    setInitSent(true);
    initAttemptCount.current += 1;
    
    console.log(`Initializing CardCom fields (attempt ${initAttemptCount.current}) with lowProfileCode:`, lowProfileCode);
    
    // Initialize the fields with a short delay to ensure the master frame is ready
    const initTimer = setTimeout(async () => {
      try {
        const success = await initializeCardcomFields(
          masterFrameRef,
          lowProfileCode!,
          sessionId!,
          terminalNumber!.toString(),
          operationType,
        );
        
        if (success) {
          console.log('CardCom initialization completed successfully');
          setIsContentReady(true);
          setInitFailed(false);
        } else {
          console.error('CardCom initialization failed');
          toast.error('שגיאה באתחול שדות התשלום. מנסה שוב...');
          setInitFailed(true);
          
          // Reset for retry after a delay
          setTimeout(() => {
            setInitSent(false);
            initAttemptedRef.current = false;
          }, 2000);
        }
      } catch (error) {
        console.error('Error during CardCom initialization:', error);
        toast.error('שגיאה באתחול שדות התשלום');
        
        // Reset for retry after a delay
        setInitFailed(true);
        setTimeout(() => {
          setInitSent(false);
          initAttemptedRef.current = false;
        }, 2000);
      }
    }, 100);
    
    return () => clearTimeout(initTimer);
  }, [canInitialize, masterFrameRef, lowProfileCode, sessionId, terminalNumber, operationType, initializeCardcomFields]);

  // Monitor init success/failure
  useEffect(() => {
    if (initFailed && initAttemptCount.current < 3) {
      console.log('Scheduling retry for CardCom initialization');
    } else if (initFailed) {
      toast.error('לא ניתן לאתחל את שדות התשלום. אנא רענן את הדף ונסה שוב');
    }
  }, [initFailed]);

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
