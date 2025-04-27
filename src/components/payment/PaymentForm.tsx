
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { PaymentStatus, PaymentStatusType } from './types/payment';
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>(PaymentStatus.IDLE);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;
      
  // Direct CardCom URL construction
  const cardcomUrl = 'https://secure.cardcom.solutions';
  const terminalNumber = '160138'; // Your CardCom terminal number
  const paymentUrl = `${cardcomUrl}/LowProfile/?LowProfileCode=${terminalNumber}`;

  // Check for iframe redirects (payment complete)
  React.useEffect(() => {
    const checkIframeStatus = () => {
      const iframe = document.getElementById('cardcom-frame') as HTMLIFrameElement;
      
      if (!iframe || !iframe.contentWindow) return;
      
      try {
        const location = iframe.contentWindow.location.href;
        
        if (location.includes('/success')) {
          setPaymentStatus(PaymentStatus.SUCCESS);
          onPaymentComplete();
        } else if (location.includes('/failed')) {
          setPaymentStatus(PaymentStatus.FAILED);
        }
      } catch (e) {
        // Cross-origin error, can't access iframe location
        // This is normal during processing
      }
    };
    
    const interval = setInterval(checkIframeStatus, 1000);
    return () => clearInterval(interval);
  }, [onPaymentComplete]);

  const renderContent = () => {
    if (isInitializing) {
      return <InitializingPayment />;
    }
    
    if (paymentStatus === PaymentStatus.SUCCESS) {
      return <SuccessfulPayment plan={plan} onContinue={() => window.location.href = '/dashboard'} />;
    }
    
    if (paymentStatus === PaymentStatus.FAILED) {
      return <FailedPayment onRetry={() => setPaymentStatus(PaymentStatus.IDLE)} />;
    }
    
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
          paymentUrl={paymentUrl}
          isReady={!isInitializing}
          terminalNumber={terminalNumber}
          cardcomUrl={cardcomUrl}
        />
      </>
    );
  };

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
            : 'הזן את פרטי כרטיס האשראי שלך לתשלום'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {renderContent()}
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {paymentStatus !== PaymentStatus.SUCCESS && 
         paymentStatus !== PaymentStatus.FAILED &&
         !isInitializing && (
          <p className="text-xs text-center text-muted-foreground">
            {plan.hasTrial 
              ? 'לא יבוצע חיוב במהלך תקופת הניסיון' 
              : 'החיוב יבוצע מיידית'}
          </p>
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
