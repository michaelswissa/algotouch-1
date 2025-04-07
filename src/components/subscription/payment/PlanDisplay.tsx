
import React from 'react';
import { CheckCircle, Gift, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlanFeatureProps {
  text: string;
}

export const PlanFeature: React.FC<PlanFeatureProps> = ({ text }) => (
  <div className="group flex items-center bg-slate-800/80 p-2.5 rounded-lg border border-primary/20">
    <CheckCircle className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
    <span className="text-sm font-medium text-slate-200">{text}</span>
  </div>
);

interface PlanDetailsSummaryProps {
  planDetails: {
    name: string;
    price: string;
    description: string;
    info: string;
  };
  isMonthlyPlan: boolean;
}

const PlanDetailsSummary: React.FC<PlanDetailsSummaryProps> = ({ planDetails, isMonthlyPlan }) => {
  return (
    <div className="mt-6 overflow-hidden">
      {/* Header section with credit card icon */}
      <div className="mb-3 flex items-center gap-3">
        <div className="bg-slate-800/80 p-1.5 rounded-md">
          <CreditCard className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-white">פרטי תשלום</h3>
      </div>

      {/* Plan details card - inspired by the provided image */}
      <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700/80">
        {/* Plan name header */}
        <div className="flex items-center justify-between bg-slate-700/50 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">מנוי {planDetails.name}</span>
          </div>
          <div className="text-xl font-bold text-white flex items-center gap-1">
            {planDetails.price}<span className="text-sm text-slate-300">/חודש</span>
          </div>
        </div>
        
        {/* Plan description */}
        <div className="px-5 py-4 text-right">
          <p className="text-slate-300 text-sm">{planDetails.description}</p>
        </div>
        
        {/* Trial badge - shown only for monthly plans */}
        {isMonthlyPlan && (
          <div className="px-5 pb-4">
            <div className={cn(
              "flex items-center justify-end gap-2 w-full py-2 px-4 rounded-md bg-primary/10",
              "border border-primary/30 text-primary"
            )}>
              <span className="text-sm font-medium">חודש ניסיון חינם</span>
              <Gift className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanDetailsSummary;
