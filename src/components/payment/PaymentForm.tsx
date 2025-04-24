
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import PaymentContent from './PaymentContent';
import { usePaymentForm } from '@/hooks/payment/usePaymentForm';
import InitializingPayment from './states/InitializingPayment';
import PaymentHeader from './PaymentHeader';
import PaymentFooter from './PaymentFooter';
import LoadingPaymentState from './states/LoadingPaymentState';
import { PaymentStatus } from './types/payment';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ 
  planId, 
  onPaymentComplete, 
  onBack 
}) => {
  const {
    isSubmitting,
    isInitializing,
    isContentReady,
    isMasterFrameLoaded,
    terminalNumber,
    cardcomUrl,
    paymentStatus,
    masterFrameRef,
    operationType,
    handleRetry,
    handleSubmitPayment,
    handleMasterFrameLoad,
    plan,
    lowProfileCode,
    sessionId
  } = usePaymentForm({ planId, onPaymentComplete });

  console.log('PaymentForm state:', { 
    isSubmitting, 
    isInitializing, 
    isContentReady, 
    isMasterFrameLoaded,
    paymentStatus
  });

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <PaymentHeader 
          paymentStatus={paymentStatus} 
          operationType={operationType} 
        />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isInitializing ? (
          <InitializingPayment />
        ) : paymentStatus === PaymentStatus.PROCESSING ? (
          <LoadingPaymentState 
            message={operationType === 'token_only' ? 
              'מעבד שמירת אמצעי תשלום...' : 
              'מעבד את התשלום...'} 
          />
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
            isReady={isContentReady && isMasterFrameLoaded}
            lowProfileCode={lowProfileCode}
            sessionId={sessionId}
            onMasterFrameLoad={handleMasterFrameLoad}
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
