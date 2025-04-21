
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { PaymentStatus, PaymentStatusType } from './types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import PaymentContent from './PaymentContent';
import { usePayment } from '@/hooks/usePayment';

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
    lowProfileCode,
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
    initializePayment();
  }, [initializePayment]);
  
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
        {/* Master frame for CardCom */}
        <iframe
          ref={masterFrameRef}
          id="CardComMasterFrame"
          name="CardComMasterFrame" 
          src={`${cardcomUrl}/api/v11/LowProfile/Create`}
          style={{ display: 'block', width: '100%', height: '500px', border: 'none' }}
          title="CardCom Payment Frame"
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
          lowProfileCode={lowProfileCode}
        />
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {[PaymentStatus.IDLE, PaymentStatus.INITIALIZING, PaymentStatus.FAILED].includes(paymentStatus) && (
          <>
            <Button 
              type="button" 
              className="w-full" 
              onClick={submitPayment}
              disabled={paymentStatus === PaymentStatus.PROCESSING}
            >
              {paymentStatus === PaymentStatus.PROCESSING ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  מעבד תשלום...
                </span>
              ) : (
                operationType === 'token_only' ? 'אשר והפעל מנוי' : 'אשר תשלום'
              )}
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
