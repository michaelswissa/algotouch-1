import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import PaymentContent from './PaymentContent';
import { usePaymentForm } from '@/hooks/payment/usePaymentForm';
import InitializingPayment from './states/InitializingPayment';
import PaymentHeader from './PaymentHeader';
import PaymentFooter from './PaymentFooter';
import PaymentIframe from './PaymentIframe';
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
    areFieldsInitialized,
    terminalNumber,
    cardcomUrl,
    paymentStatus,
    masterFrameRef,
    operationType,
    handleRetry,
    handleSubmitPayment,
    plan
  } = usePaymentForm({ planId, onPaymentComplete });

  const shouldShowFields = isContentReady && areFieldsInitialized;

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <PaymentHeader 
          paymentStatus={paymentStatus} 
          operationType={operationType} 
        />
      </CardHeader>
      
      <CardContent className="space-y-4">
        <PaymentIframe
          masterFrameRef={masterFrameRef}
          cardcomUrl={cardcomUrl}
          terminalNumber={terminalNumber}
        />
        
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
            isReady={shouldShowFields}
          />
        )}
      </CardContent>

      <CardFooter>
        <PaymentFooter
          paymentStatus={paymentStatus}
          operationType={operationType}
          isSubmitting={isSubmitting}
          isInitializing={isInitializing}
          isContentReady={shouldShowFields}
          onSubmit={handleSubmitPayment}
          onBack={onBack}
          plan={plan}
        />
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
