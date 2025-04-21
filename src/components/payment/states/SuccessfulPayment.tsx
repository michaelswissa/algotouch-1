
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { SubscriptionPlan } from '../utils/paymentHelpers';

interface SuccessfulPaymentProps {
  plan: SubscriptionPlan;
  onContinue: () => void;
}

const SuccessfulPayment: React.FC<SuccessfulPaymentProps> = ({ plan, onContinue }) => {
  return (
    <div className="text-center py-6 space-y-6">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        
        <div>
          <h3 className="text-xl font-semibold">התשלום בוצע בהצלחה!</h3>
          <p className="text-muted-foreground mt-1">
            {plan.hasTrial 
              ? `תקופת הניסיון שלך של ${plan.freeTrialDays} ימים החלה!` 
              : 'המנוי שלך הופעל בהצלחה!'}
          </p>
        </div>
      </div>
      
      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">פרטי הרכישה:</h4>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p><span className="font-medium">סוג מנוי:</span> {plan.name}</p>
          <p><span className="font-medium">מחיר:</span> {plan.displayPrice}</p>
          {plan.hasTrial && (
            <p><span className="font-medium">תקופת ניסיון:</span> {plan.freeTrialDays} ימים</p>
          )}
        </div>
      </div>
      
      <Button 
        onClick={onContinue} 
        className="w-full"
      >
        המשך למערכת
      </Button>
    </div>
  );
};

export default SuccessfulPayment;
