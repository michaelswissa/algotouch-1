
import React from 'react';
import { CheckCircle, Gift } from 'lucide-react';
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
  return (
    <div className="mt-4 overflow-hidden animate-fade-in">
      {/* Plan details card - improved design inspired by the reference */}
      <div className="bg-slate-800/90 rounded-lg overflow-hidden border border-primary/20 shadow-md">
        {/* Plan name header with improved styling */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-700/80 to-slate-800/90 px-4 py-3 border-b border-primary/20">
          <div className="flex items-center gap-2">
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
              "flex items-center justify-end gap-2 w-full py-2 px-3 rounded-md bg-primary/15",
              "border border-primary/30 text-primary"
            )}>
              <span className="text-sm font-medium">חודש ניסיון חינם</span>
              <Gift className="h-4 w-4" />
            </div>
          </div>
        )}
        
        {/* Plan features section */}
        <div className="px-4 py-3 bg-slate-700/30 border-t border-slate-600/40">
          <div className="grid grid-cols-1 gap-2">
            <PlanFeature text="גישה מלאה לכל התכונות" />
            <PlanFeature text="ביטול בכל עת, ללא התחייבות" />
          </div>
        </div>
        
        {/* Payment info section */}
        <div className="px-4 py-2 bg-slate-700/50 border-t border-slate-600/40">
          <p className="text-xs text-slate-400 text-right">{planDetails.info}</p>
        </div>
      </div>
    </div>
  );
};

interface PlanFeatureProps {
  text: string;
}

export const PlanFeature: React.FC<PlanFeatureProps> = ({ text }) => (
  <div className="flex items-center">
    <CheckCircle className="h-3.5 w-3.5 text-primary ml-2 flex-shrink-0" />
    <span className="text-xs text-slate-200">{text}</span>
  </div>
);

export default PlanDetailsSummary;
