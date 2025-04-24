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

  useEffect(() => {
    if (!isMasterFrameLoaded || !lowProfileCode || !terminalNumber) return;

    initializeCardcomFields(
      masterFrameRef,
      lowProfileCode,
      terminalNumber.toString(),
      operationType
    ).catch(() => toast.error('CardCom init failed'));
  }, [isMasterFrameLoaded, lowProfileCode, terminalNumber, masterFrameRef, operationType]);

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
    isContentReady: isMasterFrameLoaded,
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
