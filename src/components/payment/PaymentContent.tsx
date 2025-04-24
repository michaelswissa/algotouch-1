
import React from 'react';
import { PaymentStatus, PaymentStatusType } from './types/payment';
import { SubscriptionPlan } from './utils/paymentHelpers';
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
  operationType?: 'payment' | 'token_only';
  isReady?: boolean;
  lowProfileCode?: string;
  sessionId?: string;
  /** optional – forwarded down to PaymentDetails */
  onMasterFrameLoad?: () => void;
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
  isReady = false,
  lowProfileCode,
  sessionId,
  onMasterFrameLoad
}) => {
  console.log('Rendering PaymentContent with:', { 
    paymentStatus, 
    isReady, 
    hasLowProfileCode: Boolean(lowProfileCode),
    hasSessionId: Boolean(sessionId)
  });
  
  if (paymentStatus === PaymentStatus.SUCCESS) {
    return <SuccessfulPayment plan={plan} onContinue={onNavigateToDashboard} />;
  }
  
  if (paymentStatus === PaymentStatus.FAILED) {
    return <FailedPayment onRetry={onRetry} />;
  }
  
  // Default state (IDLE or PROCESSING)
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
        isReady={isReady && Boolean(lowProfileCode) && Boolean(sessionId)}
        onMasterFrameLoad={onMasterFrameLoad}
      />
    </>
  );
};

export default PaymentContent;
