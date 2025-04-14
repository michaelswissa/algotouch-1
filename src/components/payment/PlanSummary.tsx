
import React from 'react';
import { Check } from 'lucide-react';

interface PlanSummaryProps {
  planName: string;
  price: number;
  description: string;
  currency?: string;
  displayPrice?: number;
  displayCurrency?: string;
  hasTrial?: boolean;
  freeTrialDays?: number;
}

const PlanSummary: React.FC<PlanSummaryProps> = ({ 
  planName, 
  price, 
  description, 
  currency = '₪',
  displayPrice,
  displayCurrency = '$',
  hasTrial = false,
  freeTrialDays = 0
}) => {
  // Function to get the icon based on plan name
  const getPlanIcon = () => {
    if (planName.includes('VIP')) return '👑';
    if (planName.includes('שנתי')) return '💎';
    return '💼';
  };

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <div className="bg-primary/10 p-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getPlanIcon()}</span>
            <h3 className="text-xl font-bold">מנוי {planName}</h3>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{displayCurrency}{displayPrice}</span>
              <span className="text-sm text-muted-foreground">
                {planName.includes('חודשי') 
                  ? '/חודש' 
                  : planName.includes('שנתי') 
                    ? '/שנה' 
                    : ' תשלום חד פעמי'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              ({currency}{price})
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-muted-foreground mb-3">{description}</p>
        
        {hasTrial && freeTrialDays > 0 && (
          <div className="flex items-center gap-2 text-primary bg-primary/10 p-2 rounded-md">
            <Check className="h-4 w-4" />
            <p className="text-sm font-medium">{freeTrialDays} ימי ניסיון חינם</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanSummary;
