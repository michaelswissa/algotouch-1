
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
    <div className="mt-6 overflow-hidden animate-fade-in">
      {/* Plan details card with enhanced design and more compact layout */}
      <div className="bg-slate-800/90 rounded-lg overflow-hidden border border-primary/20 shadow-lg">
        {/* Enhanced plan header with better visual hierarchy */}
        <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/90 px-4 py-3.5 border-b border-primary/20">
          <div className="flex items-center justify-between">
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
            <div className="text-xl font-bold text-white flex items-center gap-1 mb-1">
              {planDetails.price}<span className="text-xs text-slate-300 mr-1">/חודש</span>
            </div>
          </div>
          
          {/* Updated social proof with trader selection with proper RTL - improved spacing */}
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-200">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span>נבחר בקפידה ע"י סוחרים מנוסים</span>
          </div>
        </div>
        
        {/* Plan description with improved typography */}
        <div className="px-4 py-3 text-right bg-slate-700/20">
          <p className="text-slate-300 text-sm leading-relaxed">{planDetails.description}</p>
        </div>
        
        {/* Restructured features section with better spacing and visual separation */}
        <div className="px-4 py-5 bg-slate-700/30 border-t border-slate-600/40">
          <div className="flex flex-col gap-6 bg-slate-800/50 p-3 rounded-md border border-slate-600/10">
            <FeatureItem 
              icon={<Shield className="h-5 w-5 text-cyan-400" />}
              title="גישה מלאה לכל התכונות"
              description="כל הכלים והמשאבים שלנו ללא הגבלה"
            />
            <FeatureItem 
              icon={<Clock className="h-5 w-5 text-green-400" />}
              title="ביטול בכל עת"
              description="שליטה מלאה בידיים שלך"
            />
            
            {isMonthlyPlan && (
              <FeatureItem 
                icon={<Gift className="h-5 w-5 text-primary" />}
                title="חודש ניסיון חינם"
                description="נסה את המערכת ללא תשלום"
                highlighted
              />
            )}
          </div>
        </div>
        
        {/* Improved payment info section */}
        <div className="px-4 py-4 bg-slate-700/50 border-t border-slate-600/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2.5 py-1.5 rounded-full hover:bg-primary/15 transition-colors">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>מנוי פשוט, ללא אותיות קטנות</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <p className="opacity-90">
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
      "bg-slate-700/60 p-2 rounded-md flex items-center justify-center group-hover:scale-105 transition-all",
      highlighted ? "bg-primary/15 shadow-sm" : ""
    )}>
      {icon}
    </div>
    <div className="mr-2.5 text-right">
      <div className={cn(
        "font-semibold leading-relaxed", 
        highlighted ? "text-white text-sm" : "text-slate-200 text-sm"
      )}>
        {title}
      </div>
      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

export default PlanDetailsSummary;
