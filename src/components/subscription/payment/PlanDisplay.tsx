
import React from 'react';
import { CheckCircle, Gift, CreditCard, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  // Determine which icon to show based on plan name
  const getPlanIcon = () => {
    switch (planDetails.name.toLowerCase()) {
      case 'חודשי':
        return <CreditCard className="h-5 w-5 text-primary mr-2" />;
      case 'שנתי':
        return <Briefcase className="h-5 w-5 text-primary mr-2" />;
      case 'vip':
        return <Briefcase className="h-5 w-5 text-primary mr-2" />;
      default:
        return <CreditCard className="h-5 w-5 text-primary mr-2" />;
    }
  };

  return (
    <div className="mt-4 overflow-hidden animate-fade-in">
      {/* Plan details card - improved design inspired by the reference */}
      <div className="bg-slate-800/95 rounded-lg overflow-hidden border border-primary/30 shadow-md">
        {/* Plan name header with improved styling */}
        <div className="flex items-center justify-between bg-slate-700 py-3.5 px-4 border-b border-primary/20">
          <div className="flex items-center">
            {getPlanIcon()}
            <span className="text-base font-bold text-white">מנוי {planDetails.name}</span>
          </div>
          <div className="text-xl font-bold text-white flex items-center gap-1">
            {planDetails.price}<span className="text-xs text-slate-300 mr-1">/חודש</span>
          </div>
        </div>
        
        {/* Plan description with better padding and text styling */}
        <div className="px-4 py-3 text-right">
          <p className="text-slate-300 text-sm">{planDetails.description}</p>
        </div>
        
        {/* Trial badge - shown only for monthly plans with improved visual emphasis */}
        {isMonthlyPlan && (
          <div className="px-4 pb-4">
            <div className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-md bg-primary/15",
              "border border-primary/30 text-primary"
            )}>
              <Gift className="h-4 w-4" />
              <span className="text-sm font-medium">חודש ניסיון חינם</span>
            </div>
          </div>
        )}
        
        {/* Plan features section - enhanced with more prominent checkmarks */}
        <div className="px-4 py-4 bg-slate-700/30 border-t border-slate-600/40">
          <div className="flex flex-col gap-3">
            <PlanFeature text="גישה מלאה לכל התכונות" />
            <PlanFeature text="ביטול בכל עת, ללא התחייבות" />
          </div>
        </div>
        
        {/* Payment info section */}
        <div className="px-4 py-3 bg-slate-700/50 border-t border-slate-600/40">
          <p className="text-xs text-slate-300 text-right">{planDetails.info}</p>
        </div>
      </div>
    </div>
  );
};

interface PlanFeatureProps {
  text: string;
}

export const PlanFeature: React.FC<PlanFeatureProps> = ({ text }) => (
  <div className="flex items-center justify-end">
    <span className="text-sm text-white ml-2">{text}</span>
    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
  </div>
);

export default PlanDetailsSummary;
