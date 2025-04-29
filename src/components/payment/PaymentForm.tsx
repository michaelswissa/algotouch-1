
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { usePaymentContext } from '@/contexts/payment/PaymentContext';
import { PaymentStatusEnum } from '@/types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { toast } from 'sonner';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';
import SuccessfulPayment from './states/SuccessfulPayment';
import FailedPayment from './states/FailedPayment';
import InitializingPayment from './states/InitializingPayment';

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
    lowProfileCode
  } = usePaymentContext();
  
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Initialize payment on mount only, with proper guards to prevent infinite loop
  useEffect(() => {
    console.log("Payment form mounted, checking if initialization is needed:", {
      planId,
      isInitializing,
      paymentStatus,
      hasLowProfileCode: Boolean(lowProfileCode)
    });
    
    // Only initialize if not already initializing and we don't have a lowProfileCode
    // (unless we previously failed)
    if (!isInitializing && 
        paymentStatus !== PaymentStatusEnum.INITIALIZING && 
        (!lowProfileCode || paymentStatus === PaymentStatusEnum.FAILED)) {
      console.log("Initializing payment for plan:", planId);
      initializePayment(planId);
    }
    
    // Cleanup on unmount only
    return () => {
      resetPaymentState();
    };
  }, [planId, paymentStatus, isInitializing, lowProfileCode]); // Remove initializePayment from dependency array

  // Call onPaymentComplete when payment succeeds
  useEffect(() => {
    if (paymentStatus === PaymentStatusEnum.SUCCESS) {
      onPaymentComplete();
    }
  }, [paymentStatus, onPaymentComplete]);

  const getButtonText = () => {
    if (paymentStatus === PaymentStatusEnum.PROCESSING) {
      return operationType === 'token_only' 
        ? <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מפעיל מנוי...</span>
        : <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד תשלום...</span>;
    }
    
    return operationType === 'token_only' ? 'אשר והפעל מנוי' : 'אשר תשלום';
  };

  const handleSubmitClick = () => {
    submitPayment();
  };

  const shouldShowPaymentContent = 
    paymentStatus !== PaymentStatusEnum.SUCCESS && 
    paymentStatus !== PaymentStatusEnum.FAILED &&
    !isInitializing;

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>
          {paymentStatus === PaymentStatusEnum.SUCCESS 
            ? 'התשלום בוצע בהצלחה!'
            : operationType === 'token_only'
              ? 'הזן את פרטי כרטיס האשראי שלך להפעלת המנוי'
              : 'הזן את פרטי כרטיס האשראי שלך לתשלום'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isInitializing ? (
          <InitializingPayment />
        ) : paymentStatus === PaymentStatusEnum.SUCCESS ? (
          <SuccessfulPayment plan={plan} onContinue={() => window.location.href = '/dashboard'} />
        ) : paymentStatus === PaymentStatusEnum.FAILED ? (
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
              disabled={paymentStatus === PaymentStatusEnum.PROCESSING}
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
        
        {onBack && paymentStatus !== PaymentStatusEnum.SUCCESS && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="absolute top-4 right-4"
            disabled={paymentStatus === PaymentStatusEnum.PROCESSING}
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
