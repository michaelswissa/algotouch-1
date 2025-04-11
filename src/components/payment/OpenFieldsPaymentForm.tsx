
import React, { useState } from 'react';
import CardcomOpenFields from './CardcomOpenFields';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface OpenFieldsPaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onCancel?: () => void;
}

const OpenFieldsPaymentForm: React.FC<OpenFieldsPaymentFormProps> = ({ 
  planId, 
  onPaymentComplete,
  onCancel 
}) => {
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleSuccess = (transactionId: string) => {
    setProcessingPayment(false);
    onPaymentComplete();
  };

  const handleError = (error: string) => {
    setProcessingPayment(false);
  };

  // Get plan details to display in the UI
  const plans = getSubscriptionPlans();
  const plan = plans[planId as keyof typeof plans] || plans.monthly;
  
  // Calculate amount to charge based on plan
  const amount = plan.price;
  
  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>
          {planId === 'monthly' 
            ? 'הירשם למנוי חודשי עם חודש ניסיון חינם' 
            : planId === 'annual' 
              ? 'הירשם למנוי שנתי עם 25% הנחה' 
              : 'הירשם למנוי VIP לכל החיים'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {planId === 'monthly' 
              ? 'המנוי כולל חודש ניסיון חינם. החיוב הראשון יתבצע רק לאחר 30 יום.'
              : planId === 'annual' 
                ? 'המנוי השנתי משקף חיסכון של 3 חודשים בהשוואה למנוי חודשי.' 
                : 'מנוי VIP הוא תשלום חד פעמי המעניק גישה לכל החיים.'}
          </AlertDescription>
        </Alert>
        
        <CardcomOpenFields 
          planId={planId}
          planName={plan.name}
          amount={amount}
          onSuccess={handleSuccess}
          onError={handleError}
          onCancel={onCancel}
        />
      </CardContent>
    </Card>
  );
};

export default OpenFieldsPaymentForm;
