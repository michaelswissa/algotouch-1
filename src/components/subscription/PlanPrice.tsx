
import React from 'react';
import { Shekel } from 'lucide-react'; // Using Shekel icon instead of BadgeShekel

interface PlanPriceProps {
  price: number;
  displayPrice: string;
  hasTrial?: boolean;
  freeTrialDays?: number;
}

const PlanPrice: React.FC<PlanPriceProps> = ({ 
  price, 
  displayPrice,
  hasTrial = false,
  freeTrialDays = 0
}) => {
  return (
    <div className="text-center py-4">
      <div className="flex items-center justify-center mb-1">
        <span className="text-3xl font-bold">{displayPrice}</span>
        <Shekel className="h-5 w-5 ml-1" />
      </div>
      
      {hasTrial && freeTrialDays > 0 && (
        <div className="text-sm text-green-600 font-medium">
          {freeTrialDays} ימי ניסיון חינם
        </div>
      )}
      
      {price > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          כולל מע"מ
        </div>
      )}
    </div>
  );
};

export default PlanPrice;
