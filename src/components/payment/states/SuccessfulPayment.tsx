
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscriptionPlan } from '../utils/paymentHelpers';

interface SuccessfulPaymentProps {
  plan: SubscriptionPlan;
  onContinue: () => void;
}

const SuccessfulPayment: React.FC<SuccessfulPaymentProps> = ({ plan, onContinue }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-4">
        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2">התשלום בוצע בהצלחה!</h3>
      <p className="text-muted-foreground">
        {plan.id === 'vip' 
          ? 'המנוי שלך הופעל לכל החיים'
          : `המנוי שלך הופעל ויחודש אוטומטית בכל ${plan.id === 'monthly' ? 'חודש' : 'שנה'}`}
      </p>
      <Button onClick={onContinue} className="mt-4">
        המשך למערכת
      </Button>
    </div>
  );
};

export default SuccessfulPayment;
