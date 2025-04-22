
import React from 'react';
import { CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import PaymentContent from '../PaymentContent';
import { PaymentStatus, PaymentStatusType } from '../types/payment';
import { SubscriptionPlan } from '../utils/paymentHelpers';

interface PaymentFormContentProps {
  isInitializing: boolean;
  paymentStatus: PaymentStatusType;
  plan: SubscriptionPlan;
  terminalNumber: string;
  cardcomUrl: string;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  frameKey: number;
  onNavigateToDashboard: () => void;
  onRetry: () => void;
  operationType: 'payment' | 'token_only';
}

const PaymentFormContent: React.FC<PaymentFormContentProps> = ({
  isInitializing,
  paymentStatus,
  plan,
  terminalNumber,
  cardcomUrl,
  masterFrameRef,
  frameKey,
  onNavigateToDashboard,
  onRetry,
  operationType
}) => {
  return (
    <CardContent className="space-y-4">
      <iframe
        key={frameKey}
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={`${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`}
        style={{ display: 'block', width: '0px', height: '0px', border: 'none' }}
        title="CardCom Master Frame"
      />
      
      {isInitializing ? (
        <div className="space-y-4 py-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            מאתחל טופס תשלום...
          </p>
        </div>
      ) : (
        <PaymentContent
          paymentStatus={paymentStatus}
          plan={plan}
          terminalNumber={terminalNumber}
          cardcomUrl={cardcomUrl}
          masterFrameRef={masterFrameRef}
          frameKey={frameKey}
          onNavigateToDashboard={onNavigateToDashboard}
          onRetry={onRetry}
          operationType={operationType}
        />
      )}
    </CardContent>
  );
};

export default PaymentFormContent;
