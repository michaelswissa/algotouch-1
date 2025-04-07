
import React from 'react';
import { Shield, Gift, Star, Clock, ArrowRight, Diamond, Calendar } from 'lucide-react';
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
    <div className="mt-5 overflow-hidden animate-fade-in">
      {/* More compact plan details card */}
      <div className="bg-slate-800/90 rounded-lg overflow-hidden border border-white/10 shadow-inner">
        {/* Reorganized plan header with stars and selection text moved to the left */}
        <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/90 px-4 py-3 border-b border-primary/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isMonthlyPlan ? (
                <Clock className="h-5 w-5 text-primary" />
              ) : (
                <Diamond className="h-5 w-5 text-blue-400" />
              )}
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white">מנוי {planDetails.name}</span>
                
                {isMonthlyPlan && (
                  <Badge className="bg-primary text-white hover:bg-primary py-0.5 animate-pulse-subtle">
                    הכי פופולרי
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-2xl font-bold text-white flex items-center gap-1">
              {planDetails.price}<span className="text-xs text-slate-300 mr-1">/חודש</span>
            </div>
          </div>
          
          {/* Stars and social proof moved to the left with RTL alignment */}
          <div className="flex items-center justify-start gap-1.5 mt-3 text-xs text-slate-200">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span>נבחר בקפידה ע"י סוחרים מנוסים</span>
          </div>
        </div>
        
        {/* More compact plan description */}
        <div className="px-4 py-2 text-right bg-slate-700/20">
          <p className="text-slate-300 text-sm leading-relaxed">{planDetails.description}</p>
        </div>
        
        {/* More compact features section */}
        <div className="px-4 py-4 bg-slate-700/30 border-t border-slate-600/40">
          <div className="flex flex-col gap-4 bg-slate-800/70 p-3 rounded-xl border border-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)]">
            <FeatureItem 
              icon={<Shield className="h-5 w-5 text-cyan-400 stroke-[2.2px]" />}
              title="גישה מלאה לכל התכונות"
              description="כל הכלים והמשאבים שלנו ללא הגבלה"
            />
            <FeatureItem 
              icon={<Clock className="h-5 w-5 text-green-400 stroke-[2.2px]" />}
              title="ביטול בכל עת"
              description="שליטה מלאה בידיים שלך"
            />
            
            {isMonthlyPlan && (
              <FeatureItem 
                icon={<Gift className="h-5 w-5 text-primary stroke-[2.2px]" />}
                title="חודש ניסיון חינם"
                description="נסה את המערכת ללא תשלום"
                highlighted
              />
            )}
          </div>
        </div>
        
        {/* More compact payment info section */}
        <div className="px-4 py-3 bg-slate-700/50 border-t border-slate-600/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full hover:bg-primary/15 transition-colors">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>מנוי פשוט, ללא אותיות קטנות</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[#C1C7D0] leading-[1.6]">
                {isMonthlyPlan ? 'החיוב הראשון לאחר 30 יום' : 'חיוב מיידי'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlighted?: boolean;
}

export const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description, highlighted }) => (
  <div className="flex items-center group">
    <div className={cn(
      "bg-slate-700/80 p-2 rounded-full flex items-center justify-center group-hover:scale-105 transition-all",
      highlighted ? "bg-primary/20 shadow-sm" : ""
    )}>
      {icon}
    </div>
    <div className="mr-5 text-right">
      <div className={cn(
        "font-medium leading-snug", 
        highlighted ? "text-white text-sm" : "text-slate-200 text-sm"
      )}>
        {title}
      </div>
      <p className="text-xs text-slate-400 mt-0.5 leading-tight">
        {description}
      </p>
    </div>
  </div>
);

export default PlanDetailsSummary;

