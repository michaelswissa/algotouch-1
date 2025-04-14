import React from 'react';
import { PaymentStatusType } from './types/payment';
import { SubscriptionPlan } from './utils/paymentHelpers';
import InitializingPayment from './states/InitializingPayment';
import ProcessingPayment from './states/ProcessingPayment';
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
}

const PaymentContent: React.FC<PaymentContentProps> = ({
  paymentStatus,
  plan,
  terminalNumber,
  cardcomUrl,
  masterFrameRef,
  onNavigateToDashboard,
  onRetry
}) => {
  switch (paymentStatus) {
    case 'initializing':
      return <InitializingPayment />;
    case 'processing':
      return <ProcessingPayment />;
    case 'success':
      return <SuccessfulPayment plan={plan} onContinue={onNavigateToDashboard} />;
    case 'failed':
      return <FailedPayment onRetry={onRetry} />;
    default:
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
  }
};

export default PaymentContent;
