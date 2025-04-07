
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CardContent, CardFooter } from '@/components/ui/card';
import PlanSummary from './PlanSummary';
import { SubscriptionPlan } from '@/types/payment';
import { ChevronRight, ExternalLink, ShieldCheck } from 'lucide-react';

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
      <CardContent className="space-y-5 pt-6">
        <PlanSummary 
          planName={plan.name} 
          price={plan.price} 
          description={plan.description}
          hasTrial={planId === 'monthly'}
          currency="$" 
        />
        
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-border/50 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium">מעבר למערכת תשלומים מאובטחת</h3>
            <p className="text-muted-foreground text-sm mt-1">
              לחץ על הכפתור למטה כדי להמשיך לעמוד התשלום המאובטח
            </p>
          </div>
          
          <div className="flex justify-center">
            <div className="relative w-full max-w-xs h-36 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-primary/40 flex items-center justify-center animate-pulse-subtle">
              <ExternalLink className="h-10 w-10 text-primary/40" />
              <div className="absolute bottom-2 text-xs text-center text-muted-foreground px-4">
                לחץ על כפתור "בצע תשלום" למטה כדי לעבור למסך התשלום
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-4 pt-4 border-t bg-muted/20">
        <Button 
          type="button"
          onClick={onExternalPayment} 
          className="w-full bg-primary hover:bg-primary/90 transition-colors text-base py-6"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <span className="animate-pulse">מעבד תשלום...</span>
            </>
          ) : (
            <>
              {planId === 'monthly' 
                ? 'התחל תקופת ניסיון חינם' 
                : 'בצע תשלום מאובטח'}
              <ChevronRight className="h-5 w-5 mr-1" />
            </>
          )}
        </Button>
        
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-1 text-primary/80">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-medium">תשלום מאובטח באמצעות CardCom</span>
          </div>
          
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
