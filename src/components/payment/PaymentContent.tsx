import React from 'react';
import { PaymentStatus } from './types/payment';
import { SubscriptionPlan } from './utils/paymentHelpers';
import SuccessfulPayment from './states/SuccessfulPayment';
import FailedPayment from './states/FailedPayment';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';

interface PaymentContentProps {
  paymentStatus: PaymentStatus;
  plan: SubscriptionPlan;
  terminalNumber: string;
  cardcomUrl: string;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  onNavigateToDashboard: () => void;
  onRetry: () => void;
  onCancel?: () => void;
  operationType?: 'payment' | 'token_only';
  isReady?: boolean;
}

const PaymentContent: React.FC<PaymentContentProps> = ({
  paymentStatus,
  plan,
  terminalNumber,
  cardcomUrl,
  masterFrameRef,
  onNavigateToDashboard,
  onRetry,
  operationType = 'payment',
  isReady = false
}) => {
  console.log('Current payment status:', paymentStatus, 'isReady:', isReady);
  
  if (paymentStatus === PaymentStatus.SUCCESS) {
    return <SuccessfulPayment plan={plan} onContinue={onNavigateToDashboard} />;
  }
  
  if (paymentStatus === PaymentStatus.FAILED) {
    return <FailedPayment onRetry={onRetry} />;
  }
  
  // Default state (IDLE)
  return (
    <>
      <PlanSummary 
        planName={plan.name} 
        planId={plan.id}
        price={plan.price}
        displayPrice={plan.displayPrice}
        description={plan.description} 
        hasTrial={plan.hasTrial}
        freeTrialDays={plan.freeTrialDays}
      />
      <PaymentDetails 
        terminalNumber={terminalNumber}
        cardcomUrl={cardcomUrl}
        masterFrameRef={masterFrameRef}
        isReady={isReady}
      />
    </>
  );
};

export default PaymentContent;
