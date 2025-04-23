
import { useState, useEffect } from 'react';
import { usePayment } from '@/hooks/usePayment';
import { toast } from 'sonner';
import { getSubscriptionPlans } from '@/components/payment/utils/paymentHelpers';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UsePaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
}

export const usePaymentForm = ({ planId, onPaymentComplete }: UsePaymentFormProps) => {
  const [isMasterFrameLoaded, setIsMasterFrameLoaded] = useState(false);

  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

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

  useEffect(() => {
    if (!masterFrameRef.current?.contentWindow) return;
    
    const handleMasterLoad = () => {
      console.log('Master frame loaded');
      setIsMasterFrameLoaded(true);
    };

    masterFrameRef.current.addEventListener('load', handleMasterLoad);
    return () => masterFrameRef.current?.removeEventListener('load', handleMasterLoad);
  }, [masterFrameRef]);

  useEffect(() => {
    console.log("Initializing payment for plan:", planId);
    const initProcess = async () => {
      await initializePayment();
    };
    
    initProcess();
  }, []); // Run only once on mount

  const handleSubmitPayment = () => {
    const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value;
    const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value;
    const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value;
    const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value;
    
    if (!cardholderName) {
      toast.error('יש למלא את שם בעל הכרטיס');
      return;
    }

    if (!cardOwnerId || !/^\d{9}$/.test(cardOwnerId)) {
      toast.error('יש למלא תעודת זהות תקינה');
      return;
    }

    if (!email) {
      toast.error('יש למלא כתובת דואר אלקטרוני');
      return;
    }

    if (!phone) {
      toast.error('יש למלא מספר טלפון');
      return;
    }
    
    try {
      submitPayment();
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('אירעה שגיאה בשליחת התשלום');
    }
  };

  // Define isInitializing for better state management
  const isInitializing = paymentStatus === PaymentStatus.INITIALIZING;

  // Determine if the iframe content is ready to be shown
  const isContentReady = !isInitializing && 
    terminalNumber && 
    cardcomUrl && 
    lowProfileCode && 
    sessionId && 
    isMasterFrameLoaded && 
    paymentStatus !== PaymentStatus.INITIALIZING;

  return {
    isSubmitting,
    isInitializing,
    isContentReady,
    isMasterFrameLoaded,
    plan,
    terminalNumber,
    cardcomUrl,
    paymentStatus,
    masterFrameRef,
    operationType,
    handleRetry,
    handleSubmitPayment,
  };
};
