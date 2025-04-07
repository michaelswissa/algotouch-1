
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CardContent, CardFooter } from '@/components/ui/card';
import PlanSummary from './PlanSummary';
import SecurityNote from './SecurityNote';
import { SubscriptionPlan } from '@/types/payment';
import { ChevronRight } from 'lucide-react';

interface PaymentCardFormProps {
  plan: SubscriptionPlan;
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent, cardData: {
    cardNumber: string;
    cardholderName: string;
    expiryDate: string;
    cvv: string;
  }) => Promise<void>;
  onExternalPayment: () => Promise<void>;
  planId: string;
}

const PaymentCardForm: React.FC<PaymentCardFormProps> = ({
  plan,
  isProcessing,
  onExternalPayment,
  planId
}) => {
  return (
    <>
      <CardContent className="space-y-5 pt-4">
        <PlanSummary 
          planName={plan.name} 
          price={plan.price} 
          description={plan.description}
          hasTrial={planId === 'monthly'}
          currency="$" 
        />
        
        <Separator />
        
        <SecurityNote />
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 pt-4 border-t bg-muted/20">
        <Button 
          type="button"
          onClick={onExternalPayment} 
          className="w-full bg-primary hover:bg-primary/90 transition-colors"
          disabled={isProcessing}
        >
          {isProcessing ? 'מעבד תשלום...' : planId === 'monthly' 
            ? 'התחל תקופת ניסיון חינם' 
            : 'בצע תשלום מאובטח'}
          <ChevronRight className="h-5 w-5 mr-1" />
        </Button>
        
        <div className="text-center">
          <p className="text-xs text-center text-muted-foreground max-w-md mx-auto">
            {planId === 'monthly' 
              ? 'ע"י לחיצה על כפתור זה, אתה מאשר את פרטי התשלום לחיוב אוטומטי לאחר תקופת הניסיון'
              : 'ע"י לחיצה על כפתור זה, אתה מאשר את ביצוע התשלום בהתאם לתנאי השימוש'}
          </p>
        </div>
      </CardFooter>
    </>
  );
};

export default PaymentCardForm;
