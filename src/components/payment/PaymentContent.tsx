
import React from 'react';
import { PaymentStatus, PaymentStatusType } from './types/payment';
import PaymentDetails from './PaymentDetails';
import FailedPayment from './states/FailedPayment';
import SuccessfulPayment from './states/SuccessfulPayment';
import ProcessingPayment from './states/ProcessingPayment';
import { SubscriptionPlan } from './utils/paymentHelpers';

interface PaymentContentProps {
  paymentStatus: PaymentStatusType;
  plan: SubscriptionPlan;
  terminalNumber: string;
  cardcomUrl: string;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  onNavigateToDashboard: () => void;
  onRetry: () => void;
  operationType?: 'payment' | 'token_only';
  operation?: string;
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
  operation,
  isReady = false
}) => {
  // Determine actual operation type (prefer operation over operationType)
  const actualOperationType = operation === 'CreateTokenOnly' ? 'token_only' : operationType;
  
  switch (paymentStatus) {
    case PaymentStatus.PROCESSING:
      return <ProcessingPayment 
        operationType={actualOperationType}
        planType={plan.id} 
        onCancel={onRetry} 
      />;
    
    case PaymentStatus.SUCCESS:
      return <SuccessfulPayment 
        plan={plan} 
        onContinue={onNavigateToDashboard} 
      />;
    
    case PaymentStatus.FAILED:
      return <FailedPayment 
        onRetry={onRetry} 
        operationType={actualOperationType} 
      />;
    
    case PaymentStatus.IDLE:
    default:
      return (
        <PaymentDetails
          terminalNumber={terminalNumber}
          cardcomUrl={cardcomUrl} 
          masterFrameRef={masterFrameRef}
          isReady={isReady}
        />
      );
  }
};

export default PaymentContent;
