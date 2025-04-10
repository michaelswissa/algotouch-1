
import React from 'react';
import { CardContent, CardFooter } from '@/components/ui/card';
import CardcomOpenFields from './CardcomOpenFields';
import { getPlanSummary } from './utils/paymentHelpers';
import { SubscriptionPlan, TokenData } from '@/types/payment';

interface PaymentCardFormProps {
  plan: SubscriptionPlan;
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent, tokenData: TokenData) => void;
  planId: string;
}

const PaymentCardForm: React.FC<PaymentCardFormProps> = ({
  plan,
  isProcessing,
  onSubmit,
  planId
}) => {
  const { summary, isFreeTrialPlan } = getPlanSummary(plan);

  const handleTokenReceived = (tokenData: TokenData) => {
    onSubmit(new Event('submit') as unknown as React.FormEvent, tokenData);
  };
  
  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
  };

  return (
    <>
      <CardContent className="space-y-6">
        {summary && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-medium">{summary.title}</h3>
            <p className="text-sm text-muted-foreground">{summary.description}</p>
            <div className="flex justify-between items-center mt-2">
              <span>{summary.pricingLabel}</span>
              <span className="font-semibold">{summary.price}</span>
            </div>
            
            {isFreeTrialPlan && (
              <p className="text-xs text-muted-foreground mt-1">
                {summary.trialNote}
              </p>
            )}
          </div>
        )}
        
        <CardcomOpenFields 
          onTokenReceived={handleTokenReceived}
          onError={handlePaymentError}
          isProcessing={isProcessing}
        />
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2 pt-0">
        <p className="text-xs text-center text-muted-foreground max-w-md mx-auto">
          {isFreeTrialPlan 
            ? "בהזנת פרטי כרטיס האשראי, אתה מאשר את תנאי השימוש וביצוע חיוב עתידי לאחר תקופת הניסיון"
            : "ע״י ביצוע התשלום, אתה מאשר את תנאי השימוש ומדיניות הפרטיות"
          }
        </p>
      </CardFooter>
    </>
  );
};

export default PaymentCardForm;
