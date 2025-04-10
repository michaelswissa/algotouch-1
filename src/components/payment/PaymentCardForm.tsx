
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CardContent, CardFooter } from '@/components/ui/card';
import PlanSummary from './PlanSummary';
import { SubscriptionPlan } from '@/types/payment';
import { ShieldCheck, Gift, ArrowRight } from 'lucide-react';

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
  const isMonthlyPlan = planId === 'monthly';
  
  return (
    <>
      <CardContent className="space-y-6 pt-6">
        <PlanSummary 
          planName={plan.name} 
          price={plan.price} 
          description={plan.description}
          hasTrial={planId === 'monthly'}
          currency="$" 
        />
        
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="text-center mb-5">
            <h3 className="text-xl font-semibold mb-2">מעבר למערכת תשלומים מאובטחת</h3>
            <p className="text-muted-foreground text-sm">
              לחץ על הכפתור למטה כדי להמשיך לעמוד התשלום המאובטח
            </p>
          </div>
          
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm h-32 bg-background/50 rounded-lg border border-dashed border-border flex flex-col items-center justify-center p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <div className="text-sm text-center text-muted-foreground px-4">
                לחץ על כפתור "{isMonthlyPlan ? 'התחל תקופת ניסיון' : 'המשך לתשלום'}" למטה
              </div>
              <div className="absolute -bottom-4 right-1/2 transform translate-x-1/2">
                <div className="animate-bounce text-primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4V20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-4 pt-4 border-t">
        <Button 
          type="button"
          onClick={onExternalPayment} 
          className="w-full py-5 text-base shadow-sm font-medium group"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              מעבד תשלום...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2 group-hover:gap-3 transition-all">
              {isMonthlyPlan ? (
                <>
                  <Gift className="h-5 w-5" />
                  התחל תקופת ניסיון חינם
                </>
              ) : (
                <>
                  בצע תשלום מאובטח
                </>
              )}
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>
        
        <div className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full text-xs border border-blue-100 dark:border-blue-900/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>תשלום מאובטח</span>
            </div>
            
            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-full text-xs border border-green-100 dark:border-green-900/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>SSL מוצפן</span>
            </div>
          </div>
          
          <p className="text-xs text-center text-muted-foreground max-w-md mx-auto">
            {isMonthlyPlan 
              ? 'ע"י לחיצה על כפתור זה, אתה מאשר את פרטי התשלום לחיוב אוטומטי לאחר תקופת הניסיון'
              : 'ע"י לחיצה על כפתור זה, אתה מאשר את ביצוע התשלום בהתאם לתנאי השימוש'}
          </p>
        </div>
      </CardFooter>
    </>
  );
};

export default PaymentCardForm;
