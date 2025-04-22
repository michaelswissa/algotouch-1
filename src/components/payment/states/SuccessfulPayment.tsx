
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscriptionPlan } from '../utils/paymentHelpers';

interface SuccessfulPaymentProps {
  plan: SubscriptionPlan;
  onContinue: () => void;
}

const SuccessfulPayment: React.FC<SuccessfulPaymentProps> = ({ plan, onContinue }) => {
  const isMonthly = plan.id === 'monthly';
  
  return (
    <div className="text-center py-10 space-y-6">
      <div className="flex flex-col items-center gap-4">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <div>
          <h3 className="text-xl font-medium mb-1">
            {isMonthly ? 'המנוי הופעל בהצלחה!' : 'התשלום בוצע בהצלחה!'}
          </h3>
          <p className="text-muted-foreground">
            {isMonthly 
              ? 'פרטי הכרטיס נשמרו בהצלחה. החיוב הראשון יתבצע בתום תקופת הניסיון.'
              : `מנוי ${plan.name} הופעל בהצלחה עבור חשבונך.`}
          </p>
        </div>
      </div>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-lg border border-green-100 dark:border-green-800">
        <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">פרטי התשלום</h4>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-green-700 dark:text-green-400">סוג מנוי:</dt>
            <dd className="font-medium">{plan.name}</dd>
          </div>
          
          {isMonthly ? (
            <>
              <div className="flex justify-between">
                <dt className="text-green-700 dark:text-green-400">תקופת ניסיון:</dt>
                <dd className="font-medium">{plan.freeTrialDays} ימים</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-green-700 dark:text-green-400">מחיר חודשי:</dt>
                <dd className="font-medium">{plan.displayPrice}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-green-700 dark:text-green-400">חיוב ראשון:</dt>
                <dd className="font-medium">לאחר תקופת הניסיון</dd>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <dt className="text-green-700 dark:text-green-400">סכום ששולם:</dt>
                <dd className="font-medium">{plan.displayPrice}</dd>
              </div>
              {plan.id === 'annual' && (
                <div className="flex justify-between">
                  <dt className="text-green-700 dark:text-green-400">תוקף המנוי:</dt>
                  <dd className="font-medium">12 חודשים</dd>
                </div>
              )}
              {plan.id === 'vip' && (
                <div className="flex justify-between">
                  <dt className="text-green-700 dark:text-green-400">תוקף המנוי:</dt>
                  <dd className="font-medium">ללא הגבלת זמן</dd>
                </div>
              )}
            </>
          )}
        </dl>
      </div>
      
      <Button onClick={onContinue} className="w-full">
        המשך למערכת
      </Button>
    </div>
  );
};

export default SuccessfulPayment;
