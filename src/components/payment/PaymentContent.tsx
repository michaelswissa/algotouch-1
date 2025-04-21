
import React from 'react';
import { PaymentStatus, PaymentStatusType } from './types/payment';
import { SubscriptionPlan } from './utils/paymentHelpers';
import InitializingPayment from './states/InitializingPayment';
import ProcessingPayment from './ProcessingPayment';
import SuccessfulPayment from './states/SuccessfulPayment';
import FailedPayment from './states/FailedPayment';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';

interface PaymentContentProps {
  paymentStatus: PaymentStatusType;
  plan: SubscriptionPlan;
  terminalNumber: string;
  cardcomUrl: string;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  onNavigateToDashboard: () => void;
  onRetry: () => void;
  onCancel?: () => void;
  operationType?: 'payment' | 'token_only';
}

const PaymentContent: React.FC<PaymentContentProps> = ({
  paymentStatus,
  plan,
  terminalNumber,
  cardcomUrl,
  masterFrameRef,
  onNavigateToDashboard,
  onRetry,
  onCancel,
  operationType = 'payment'
}) => {
  console.log('Current payment status:', paymentStatus);
  
  // Render different content based on payment status
  if (paymentStatus === PaymentStatus.INITIALIZING) {
    return <InitializingPayment />;
  }
  
  if (paymentStatus === PaymentStatus.PROCESSING) {
    return <ProcessingPayment 
      onCancel={onCancel} 
      operationType={operationType}
      planType={plan.id}
    />;
  }
  
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
      />
    </>
  );
};

export default PaymentContent;
