import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PaymentProvider, usePayment } from '@/contexts/payment/PaymentContext';
import { PaymentStatus } from './types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { toast } from 'sonner';
import PaymentFormHeader from './sections/PaymentFormHeader';
import PaymentFormContent from './sections/PaymentFormContent';
import PaymentFormActions from './sections/PaymentFormActions';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentFormContent: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  const {
    state: { 
      terminalNumber, 
      cardcomUrl, 
      paymentStatus, 
      lowProfileCode 
    },
    masterFrameRef,
    frameKey,
    initializePayment,
    handleRetry,
    submitPayment
  } = usePayment();

  useEffect(() => {
    console.log("Initializing payment for plan:", planId);
    setIsInitializing(true);
    initializePayment().finally(() => {
      setIsInitializing(false);
    });
  }, [initializePayment, planId]);
  
  const operationType = planId === 'monthly' ? 'token_only' : 'payment';

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
    
    if (!lowProfileCode) {
      toast.error('שגיאה באתחול התשלום, אנא רענן ונסה שנית');
      console.error('Missing lowProfileCode for payment');
      handleRetry();
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      submitPayment();
      
      setTimeout(() => {
        setIsSubmitting(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('אירעה שגיאה בשליחת התשלום');
      setIsSubmitting(false);
    }
  };

  const showPaymentButton = !isInitializing && 
    paymentStatus === PaymentStatus.IDLE && 
    lowProfileCode && 
    !isSubmitting;

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <PaymentFormHeader 
        paymentStatus={paymentStatus} 
        operationType={operationType} 
      />
      
      <PaymentFormContent
        isInitializing={isInitializing}
        paymentStatus={paymentStatus}
        plan={plan}
        terminalNumber={terminalNumber}
        cardcomUrl={cardcomUrl}
        masterFrameRef={masterFrameRef}
        frameKey={frameKey}
        onNavigateToDashboard={() => window.location.href = '/dashboard'}
        onRetry={handleRetry}
        operationType={operationType}
      />

      <PaymentFormActions
        isSubmitting={isSubmitting}
        paymentStatus={paymentStatus}
        operationType={operationType}
        onSubmit={handleSubmitPayment}
        onBack={onBack}
        showPaymentButton={showPaymentButton}
        plan={plan}
      />
    </Card>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <PaymentProvider planId={props.planId} onPaymentComplete={props.onPaymentComplete}>
      <PaymentFormContent {...props} />
    </PaymentProvider>
  );
};

export default PaymentForm;
