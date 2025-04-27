
import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { usePaymentContext } from '@/contexts/payment/PaymentContext';
import { PaymentStatus } from './types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { toast } from 'sonner';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';
import SuccessfulPayment from './states/SuccessfulPayment';
import FailedPayment from './states/FailedPayment';
import InitializingPayment from './states/InitializingPayment';
import { useCallback } from 'react';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { CardComService } from '@/services/payment/CardComService';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  const { 
    initializePayment, 
    paymentStatus, 
    isInitializing, 
    operationType,
    resetPaymentState,
    terminalNumber,
    cardcomUrl,
    submitPayment,
    lowProfileCode,
    error
  } = usePaymentContext();
  
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Initialize payment on mount only
  useEffect(() => {
    PaymentLogger.log("Initializing payment for plan:", planId);
    initializePayment(planId);
    
    // Cleanup on unmount only
    return () => {
      resetPaymentState();
    };
  }, [planId, initializePayment, resetPaymentState]);

  // Call onPaymentComplete when payment succeeds
  useEffect(() => {
    if (paymentStatus === PaymentStatus.SUCCESS) {
      onPaymentComplete();
    }
  }, [paymentStatus, onPaymentComplete]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const getButtonText = () => {
    if (paymentStatus === PaymentStatus.PROCESSING) {
      return operationType === 'token_only' 
        ? <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מפעיל מנוי...</span>
        : <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד תשלום...</span>;
    }
    
    return operationType === 'token_only' ? 'אשר והפעל מנוי' : 'אשר תשלום';
  };

  const handleSubmitClick = () => {
    const cardOwnerName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '';
    const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '';
    const cardOwnerEmail = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '';
    const cardOwnerPhone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '';
    const expirationMonth = document.querySelector<HTMLSelectElement>('select[name="expirationMonth"]')?.value || '';
    const expirationYear = document.querySelector<HTMLSelectElement>('select[name="expirationYear"]')?.value || '';
    
    submitPayment({
      cardOwnerName,
      cardOwnerId,
      cardOwnerEmail,
      cardOwnerPhone,
      expirationMonth,
      expirationYear,
    });
  };

  const shouldShowPaymentContent = 
    paymentStatus !== PaymentStatus.SUCCESS && 
    paymentStatus !== PaymentStatus.FAILED &&
    !isInitializing;

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>
          {paymentStatus === PaymentStatus.SUCCESS 
            ? 'התשלום בוצע בהצלחה!'
            : operationType === 'token_only'
              ? 'הזן את פרטי כרטיס האשראי שלך להפעלת המנוי'
              : 'הזן את פרטי כרטיס האשראי שלך לתשלום'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isInitializing ? (
          <InitializingPayment />
        ) : paymentStatus === PaymentStatus.SUCCESS ? (
          <SuccessfulPayment plan={plan} onContinue={() => window.location.href = '/dashboard'} />
        ) : paymentStatus === PaymentStatus.FAILED ? (
          <FailedPayment onRetry={() => initializePayment(planId)} />
        ) : (
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
              isReady={!isInitializing && lowProfileCode !== ''}
            />
          </>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {shouldShowPaymentContent && (
          <>
            <Button 
              type="button" 
              className="w-full" 
              onClick={handleSubmitClick}
              disabled={paymentStatus === PaymentStatus.PROCESSING}
            >
              {getButtonText()}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {operationType === 'token_only' 
                ? 'החיוב הראשון יבוצע בתום תקופת הניסיון' 
                : plan.hasTrial 
                  ? 'לא יבוצע חיוב במהלך תקופת הניסיון' 
                  : 'החיוב יבוצע מיידית'}
            </p>
          </>
        )}
        
        {onBack && paymentStatus !== PaymentStatus.SUCCESS && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="absolute top-4 right-4"
            disabled={paymentStatus === PaymentStatus.PROCESSING}
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
