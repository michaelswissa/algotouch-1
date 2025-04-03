
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
        <div className="text-primary font-medium">
          חודש ניסיון מתנה
        </div>
      )}
      {planId === 'annual' && (
        <div className="text-blue-500 dark:text-blue-400 font-medium">
          25% הנחה | שלושה חודשים מתנה
        </div>
      )}
    </div>
  );
};

export default PlanPricing;
