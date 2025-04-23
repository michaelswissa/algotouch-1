
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import PaymentContent from './PaymentContent';
import { usePayment } from '@/hooks/usePayment';
import { PaymentStatus } from './types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { toast } from 'sonner';
import InitializingPayment from './states/InitializingPayment';
import PaymentHeader from './PaymentHeader';
import PaymentFooter from './PaymentFooter';
import PaymentIframe from './PaymentIframe';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
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
    initializePayment,
    handleRetry,
    submitPayment,
    lowProfileCode,
    sessionId
  } = usePayment({
    planId,
    onPaymentComplete
  });

  // Monitor when master frame is loaded
  useEffect(() => {
    const masterFrame = masterFrameRef.current;
    if (!masterFrame) return;
    
    const handleMasterLoad = () => {
      console.log('Master frame loaded');
      setIsMasterFrameLoaded(true);
    };

    masterFrame.addEventListener('load', handleMasterLoad);
    return () => masterFrame.removeEventListener('load', handleMasterLoad);
  }, [masterFrameRef]);

  useEffect(() => {
    console.log("Initializing payment for plan:", planId);
    const initProcess = async () => {
      setIsInitializing(true);
      await initializePayment();
      setIsInitializing(false);
    };
    
    initProcess();
  }, []); // Run only once on mount

  const handleSubmitPayment = () => {
    const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value;
    const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value;
    
    if (!cardholderName) {
      toast.error('יש למלא את שם בעל הכרטיס');
      return;
    }

    if (!cardOwnerId || !/^\d{9}$/.test(cardOwnerId)) {
      toast.error('יש למלא תעודת זהות תקינה');
      return;
    }

    const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value;
    if (!email) {
      toast.error('יש למלא כתובת דואר אלקטרוני');
      return;
    }

    const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value;
    if (!phone) {
      toast.error('יש למלא מספר טלפון');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      submitPayment();
      setTimeout(() => { setIsSubmitting(false); }, 3000);
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('אירעה שגיאה בשליחת התשלום');
      setIsSubmitting(false);
    }
  };

  // Determine if the iframe content is ready to be shown
  const isContentReady = !isInitializing && 
    terminalNumber && 
    cardcomUrl && 
    lowProfileCode && 
    sessionId && 
    isMasterFrameLoaded && 
    paymentStatus !== PaymentStatus.INITIALIZING;

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <PaymentHeader 
          paymentStatus={paymentStatus} 
          operationType={operationType} 
        />
      </CardHeader>
      
      <CardContent className="space-y-4">
        <PaymentIframe
          masterFrameRef={masterFrameRef}
          cardcomUrl={cardcomUrl}
          terminalNumber={terminalNumber}
        />
        
        {isInitializing ? (
          <InitializingPayment />
        ) : (
          <PaymentContent
            paymentStatus={paymentStatus}
            plan={plan}
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            masterFrameRef={masterFrameRef}
            onNavigateToDashboard={() => window.location.href = '/dashboard'}
            onRetry={handleRetry}
            operationType={operationType}
            isReady={isContentReady}
          />
        )}
      </CardContent>

      <CardFooter>
        <PaymentFooter
          paymentStatus={paymentStatus}
          operationType={operationType}
          isSubmitting={isSubmitting}
          isInitializing={isInitializing}
          isContentReady={isContentReady}
          onSubmit={handleSubmitPayment}
          onBack={onBack}
          plan={plan}
        />
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
