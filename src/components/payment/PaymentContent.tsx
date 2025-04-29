
import React from 'react';
import { PaymentStatusEnum } from '@/types/payment';
import { SubscriptionPlan } from './utils/paymentHelpers';
import SuccessfulPayment from './states/SuccessfulPayment';
import FailedPayment from './states/FailedPayment';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';

interface PaymentContentProps {
  paymentStatus: PaymentStatusEnum;
  plan: SubscriptionPlan;
  terminalNumber: string;
  cardcomUrl: string;
  onNavigateToDashboard: () => void;
  onRetry: () => void;
  onCancel?: () => void;
  operationType?: 'payment' | 'token_only';
  isReady?: boolean;
  onPaymentStatus?: (status: PaymentStatusEnum) => void;
}

const PaymentContent: React.FC<PaymentContentProps> = ({
  paymentStatus,
  plan,
  terminalNumber,
  cardcomUrl,
  onNavigateToDashboard,
  onRetry,
  onCancel,
  operationType = 'payment',
  isReady = false,
  onPaymentStatus
}) => {
  console.log('Current payment status:', paymentStatus, 'isReady:', isReady);
  
  if (paymentStatus === PaymentStatusEnum.SUCCESS) {
    return <SuccessfulPayment plan={plan} onContinue={onNavigateToDashboard} />;
  }
  
  if (paymentStatus === PaymentStatusEnum.FAILED) {
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
        planId={plan.id}
        terminalNumber={terminalNumber}
        cardcomUrl={cardcomUrl}
        isReady={isReady}
        onPaymentStatus={onPaymentStatus}
      />
    </>
  );
};

export default PaymentContent;
