
import React from 'react';
import { CheckCircle, Gift, Star, Rocket, Diamond } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
      {/* Plan details card - improved design with better value proposition */}
      <div className="bg-slate-800/90 rounded-lg overflow-hidden border border-primary/20 shadow-lg">
        {/* Enhanced plan name header with icon and pricing */}
        <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/90 px-4 py-3 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isMonthlyPlan ? (
                <Rocket className="h-5 w-5 text-primary" />
              ) : (
                <Diamond className="h-5 w-5 text-blue-400" />
              )}
              <span className="text-base font-bold text-white">מנוי {planDetails.name}</span>
              
              {isMonthlyPlan && (
                <Badge className="bg-primary/80 hover:bg-primary text-xs py-0.5 animate-pulse-subtle">
                  חודש חינם
                </Badge>
              )}
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-1">
              {planDetails.price}<span className="text-xs text-slate-300 mr-1">/חודש</span>
            </div>
          </div>
          
          {/* Social proof indicator */}
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-300">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span>מעל 10,000 משתמשים מרוצים</span>
          </div>
        </div>
        
        {/* Plan description with improved typography */}
        <div className="px-4 py-3 text-right bg-slate-700/20">
          <p className="text-slate-300 text-sm">{planDetails.description}</p>
        </div>
        
        {/* Enhanced features section with visual checkmarks */}
        <div className="px-4 py-4 bg-slate-700/30 border-t border-slate-600/40">
          <h4 className="text-sm font-medium text-white mb-3 text-right">יתרונות המנוי:</h4>
          <div className="grid grid-cols-1 gap-3">
            <FeatureItem text="גישה מלאה לכל התכונות" highlighted />
            <FeatureItem text="ביטול בכל עת, ללא התחייבות" highlighted />
            <FeatureItem text="תמיכה אישית מהמומחים שלנו" />
            {isMonthlyPlan && (
              <div className="flex items-center gap-2 justify-end text-sm">
                <div className={cn(
                  "flex items-center gap-2 py-2 px-3 rounded-md bg-primary/20 border border-primary/30",
                  "text-primary font-medium text-sm mt-1 animate-pulse-subtle"
                )}>
                  <span>חודש ניסיון חינם</span>
                  <Gift className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Payment info section with enhanced clarity */}
        <div className="px-4 py-3 bg-slate-700/50 border-t border-slate-600/40">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 text-right font-medium">
              {isMonthlyPlan ? 'החיוב הראשון לאחר 30 יום' : 'חיוב מיידי'}
            </p>
            <div className="flex items-center gap-1 text-xs text-primary">
              <span>שליטה מלאה בידיים שלך</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FeatureItemProps {
  text: string;
  highlighted?: boolean;
}

export const FeatureItem: React.FC<FeatureItemProps> = ({ text, highlighted }) => (
  <div className="flex items-center justify-end">
    <span className={cn(
      "text-sm", 
      highlighted ? "text-white font-medium" : "text-slate-200"
    )}>
      {text}
    </span>
    <CheckCircle className={cn(
      "h-4 w-4 mr-2 flex-shrink-0",
      highlighted ? "text-primary" : "text-green-400"
    )} />
  </div>
);

export default PlanDetailsSummary;
