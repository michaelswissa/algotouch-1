
import React from 'react';
import { PaymentStatus, PaymentStatusType } from './types/payment';
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
  switch (paymentStatus) {
    case PaymentStatus.INITIALIZING:
      return <InitializingPayment />;
    case PaymentStatus.PROCESSING:
      return <ProcessingPayment 
        onCancel={onCancel} 
        operationType={operationType}
        planType={plan.id}
      />;
    case PaymentStatus.SUCCESS:
      return <SuccessfulPayment plan={plan} onContinue={onNavigateToDashboard} />;
    case PaymentStatus.FAILED:
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
