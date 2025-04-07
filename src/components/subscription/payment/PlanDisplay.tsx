
import React from 'react';
import { CheckCircle, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlanFeatureProps {
  text: string;
}

export const PlanFeature: React.FC<PlanFeatureProps> = ({ text }) => (
  <div className="group flex items-center bg-gradient-to-br from-slate-800/80 to-slate-900/90 p-3.5 rounded-lg border border-primary/20 shadow-lg backdrop-blur-sm hover:border-primary/40 hover:bg-slate-800/90 transition-all duration-300">
    <div className="relative mr-2.5 flex-shrink-0">
      <div className="absolute inset-0 bg-green-400/20 rounded-full blur-md group-hover:bg-green-400/30 transition-colors duration-300"></div>
      <CheckCircle className="h-4 w-4 text-green-400 relative z-10" />
    </div>
    <span className="text-sm leading-relaxed font-medium text-slate-200 group-hover:text-white transition-colors duration-300">{text}</span>
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
    <div className="relative mt-8 rounded-xl overflow-hidden shadow-2xl border border-primary/30 bg-slate-800/60 backdrop-blur-md transform transition-all duration-300 hover:shadow-primary/5 animate-fade-in">
      {/* Subtle highlight edge */}
      <div className="absolute inset-x-0 h-0.5 top-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      <div className="absolute inset-y-0 w-0.5 right-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
      
      {/* Header with modern gradient background */}
      <div className="bg-gradient-to-r from-slate-800/90 to-slate-900 p-6 border-b border-primary/20 backdrop-blur-sm">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold tracking-wider text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">{planDetails.name}</h3>
            {isMonthlyPlan && (
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary" className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 flex items-center gap-1.5 animate-pulse-subtle">
                  <Gift className="h-3.5 w-3.5" />
                  <span className="font-medium tracking-wide">30 ימים חינם!</span>
                </Badge>
              </div>
            )}
          </div>
          
          {/* Modern price tag with 3D effect */}
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/5 rounded-xl blur-lg group-hover:bg-primary/10 transition-colors duration-300"></div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl shadow-lg border border-primary/30 backdrop-blur-md transform group-hover:-translate-y-1 transition-all duration-300 relative">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/90 to-primary/80 tracking-tighter group-hover:scale-105 transition-transform duration-300">{planDetails.price}</div>
              <div className="text-xs text-slate-400 text-center mt-1 font-medium">{isMonthlyPlan ? 'לאחר תקופת הניסיון' : 'סה״כ לתשלום'}</div>
              
              {/* Subtle shine effect */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity transform rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] duration-1000 pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Plan features and benefits with modern design */}
      <div className="relative bg-gradient-to-br from-slate-800/70 to-slate-900/80 p-6 backdrop-blur-sm">
        <p className="text-sm font-medium mb-6 text-slate-300 leading-relaxed">{planDetails.description}</p>
        
        {/* Key benefits with glass morphism effect */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <PlanFeature text="גישה מלאה לכל התכנים" />
          <PlanFeature text="תמיכה טכנית 24/7" />
          <PlanFeature text="ביטול בכל עת" />
        </div>
        
        {/* Payment schedule info with modern design */}
        <div className="flex items-center gap-2.5 mt-6 bg-gradient-to-r from-slate-900/80 to-slate-800/60 px-4 py-3 rounded-full w-fit border border-primary/20 shadow-lg backdrop-blur-md">
          {isMonthlyPlan ? (
            <>
              <div className="relative">
                <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-md"></div>
                <Gift className="h-4 w-4 text-purple-400 relative z-10" />
              </div>
              <span className="text-sm font-medium leading-relaxed tracking-wide text-slate-300">{planDetails.info}</span>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="absolute inset-0 bg-green-400/20 rounded-full blur-md"></div>
                <CheckCircle className="h-4 w-4 text-green-400 relative z-10" />
              </div>
              <span className="text-sm font-medium leading-relaxed tracking-wide text-slate-300">{planDetails.info}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanDetailsSummary;
