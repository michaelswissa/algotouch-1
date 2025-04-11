
import React from 'react';

interface PlanPricingProps {
  price: number;
  displayPrice: number;
  currency: string;
  displayCurrency: string;
  billingPeriod: string;
  planId: string;
}

const PlanPricing: React.FC<PlanPricingProps> = ({ 
  price, 
  displayPrice,
  currency, 
  displayCurrency,
  billingPeriod, 
  planId 
}) => {
  return (
    <div className="mt-2 flex flex-col">
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold tracking-tight">{displayCurrency}{displayPrice}</span>
        <span className="text-muted-foreground text-sm ml-1"> {billingPeriod}</span>
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {planId === 'monthly' ? (
          <span>חודש ראשון חינם, אח״כ {currency}{price} לחודש</span>
        ) : planId === 'annual' ? (
          <span>חיוב שנתי: {currency}{price}</span>
        ) : (
          <span>תשלום חד פעמי: {currency}{price}</span>
        )}
      </div>
      {planId === 'monthly' && (
        <div className="text-purple-500 dark:text-purple-400 font-medium text-sm mt-1">
          חודש ניסיון מתנה
        </div>
      )}
      {planId === 'annual' && (
        <div className="flex items-center gap-2 mt-1">
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium px-2 py-0.5 rounded-md text-xs">
            25% הנחה
          </div>
          <div className="text-blue-500 dark:text-blue-400 font-medium text-xs">
            שלושה חודשים מתנה
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanPricing;
