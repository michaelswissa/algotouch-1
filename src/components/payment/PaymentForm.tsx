
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import PaymentContent from './PaymentContent';
import { usePayment } from '@/hooks/usePayment';
import { PaymentStatus } from './types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  const {
    terminalNumber,
    cardcomUrl,
    paymentStatus,
    masterFrameRef,
    operationType,
    initializePayment,
    handleRetry,
    handleCancel,
    submitPayment
  } = usePayment({
    planId,
    onPaymentComplete
  });

  useEffect(() => {
    console.log("Initializing payment for plan:", planId);
    initializePayment();
  }, []); // Run only once on mount
  
  // Determine button text based on operation type and status
  const getButtonText = () => {
    if (paymentStatus === PaymentStatus.PROCESSING) {
      return operationType === 'token_only' 
        ? <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מפעיל מנוי...</span>
        : <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד תשלום...</span>;
    }
    
    return operationType === 'token_only' ? 'אשר והפעל מנוי' : 'אשר תשלום';
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
            : operationType === 'token_only'
              ? 'הזן את פרטי כרטיס האשראי שלך להפעלת המנוי'
              : 'הזן את פרטי כרטיס האשראי שלך לתשלום'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Master frame for CardCom - hidden but essential */}
        <iframe
          ref={masterFrameRef}
          id="CardComMasterFrame"
          name="CardComMasterFrame"
          src={`${cardcomUrl}/api/openfields/master`}
          style={{ display: 'block', width: '0px', height: '0px', border: 'none' }}
          title="CardCom Master Frame"
        />
        
        <PaymentContent
          paymentStatus={paymentStatus}
          plan={plan}
          terminalNumber={terminalNumber}
          cardcomUrl={cardcomUrl}
          masterFrameRef={masterFrameRef}
          onNavigateToDashboard={() => window.location.href = '/dashboard'}
          onRetry={handleRetry}
          onCancel={handleCancel}
          operationType={operationType}
        />
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {(paymentStatus === PaymentStatus.IDLE || paymentStatus === PaymentStatus.PROCESSING) && (
          <>
            <Button 
              type="button" 
              className="w-full" 
              onClick={submitPayment}
              disabled={paymentStatus !== PaymentStatus.IDLE}
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
