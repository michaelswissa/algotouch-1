
import { useState, useEffect } from 'react';
import { usePayment } from '@/hooks/usePayment';
import { toast } from 'sonner';
import { getSubscriptionPlans } from '@/components/payment/utils/paymentHelpers';
import { PaymentStatus } from '@/components/payment/types/payment';
import { initializeCardcomFields } from '@/hooks/useCardcomInitializer';

interface UsePaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePaymentForm = ({ planId, onPaymentComplete }: UsePaymentFormProps) => {
  const [isMasterFrameLoaded, setIsMasterFrameLoaded] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
  const [initSent, setInitSent] = useState(false);

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
  } = usePayment({
    planId,
    onPaymentComplete
  });

  const handleMasterFrameLoad = () => {
    console.log('💡 Master frame loaded');
    setIsMasterFrameLoaded(true);
  };

  // Only initialize once the master frame is loaded and we have the required data
  const readyToInit =
    isMasterFrameLoaded && lowProfileCode && terminalNumber && !initSent;

  useEffect(() => {
    if (!readyToInit) return;
    
    console.log('Initializing CardCom fields with lowProfileCode:', lowProfileCode);
    setInitSent(true);
    
    initializeCardcomFields(
      masterFrameRef,
      lowProfileCode!,
      terminalNumber!.toString(),
      operationType,
    ).then((success) => {
      if (success) {
        console.log('CardCom initialization completed successfully');
        setIsContentReady(true);
      } else {
        toast.error('שגיאה באתחול שדות התשלום');
        console.error('CardCom initialization failed');
      }
    });
  }, [readyToInit, masterFrameRef, lowProfileCode, terminalNumber, operationType]);

  // Fallback in case master frame doesn't trigger onLoad
  useEffect(() => {
    const t = setTimeout(() => {
      if (!isMasterFrameLoaded && masterFrameRef.current) {
        console.warn('Master frame onLoad did not fire – forcing ready state');
        setIsMasterFrameLoaded(true);
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
