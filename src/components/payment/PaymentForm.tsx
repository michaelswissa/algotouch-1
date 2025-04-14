
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import PaymentContent from './PaymentContent';
import { usePayment } from '@/hooks/usePayment';
import { PaymentStatus } from './utils/paymentHelpers';
import { getSubscriptionPlans } from './utils/paymentHelpers';

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
    initializePayment,
    handleRetry
  } = usePayment({
    planId,
    onPaymentComplete
  });
  
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
        <iframe
          ref={masterFrameRef}
          id="CardComMasterFrame"
          name="CardComMasterFrame"
          src={`https://secure.cardcom.solutions/External/openFields/master.html?terminalnumber=${terminalNumber}&rtl=true`}
          style={{ display: 'none' }}
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
        />
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {paymentStatus === PaymentStatus.IDLE && (
          <>
            <Button 
              type="button" 
              className="w-full" 
              onClick={initializePayment}
            >
              {paymentStatus === PaymentStatus.INITIALIZING ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> טוען...
                </span>
              ) : 'שלם עכשיו'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {plan.hasTrial ? 'לא יבוצע חיוב במהלך תקופת הניסיון' : 'החיוב יבוצע מיידית'}
            </p>
          </>
        )}
        
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="absolute top-4 right-4"
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
