
import React from 'react';

interface PlanPricingProps {
  price: number;
  currency: string;
  billingPeriod: string;
  planId: string;
}

const PlanPricing: React.FC<PlanPricingProps> = ({ 
  price, 
  currency, 
  billingPeriod, 
  planId 
}) => {
  return (
    <div className="mt-3 flex flex-col">
      <div className="flex items-end gap-1 mb-1">
        <span className="text-4xl font-bold tracking-tight">{currency}{price}</span>
        <span className="text-muted-foreground ml-1"> {billingPeriod}</span>
      </div>
      {planId === 'monthly' && (
        <div className="text-purple-500 dark:text-purple-400 font-medium">
          חודש ניסיון מתנה
        </div>
      )}
      {planId === 'annual' && (
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium px-2 py-0.5 rounded-md text-sm">
            25% הנחה
          </div>
          <div className="text-blue-500 dark:text-blue-400 font-medium">
            שלושה חודשים מתנה
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanPricing;
