
import React from 'react';
import { Shekel } from '@/components/icons/Shekel';

interface PlanPriceProps {
  price: number;
  displayPrice?: number;
  hasTrial?: boolean;
  freeTrialDays?: number;
}

const PlanPrice: React.FC<PlanPriceProps> = ({ 
  price, 
  displayPrice = price, 
  hasTrial = false, 
  freeTrialDays = 0 
}) => {
  return (
    <div className="text-center mb-6">
      <div className="flex items-center justify-center mb-2">
        <span className="text-3xl font-bold">{displayPrice}</span>
        <Shekel className="ml-1 h-5 w-5" />
        <span className="text-muted-foreground ml-1 text-sm">לחודש</span>
      </div>
      {hasTrial && freeTrialDays > 0 && (
        <div className="text-center text-sm text-green-600 dark:text-green-400 font-medium">
          {freeTrialDays} ימי ניסיון חינם
        </div>
      )}
      {price !== displayPrice && (
        <div className="text-sm text-muted-foreground">
          לאחר מכן {price} <Shekel className="inline-block h-3 w-3" /> לחודש
        </div>
      )}
    </div>
  );
};

export default PlanPrice;
