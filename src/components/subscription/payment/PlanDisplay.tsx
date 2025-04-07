
import React from 'react';
import { CheckCircle, Gift, Star, Shield, Clock, ArrowRight, Users, Diamond } from 'lucide-react';
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
      {/* Plan details card with enhanced design and value proposition */}
      <div className="bg-slate-800/90 rounded-lg overflow-hidden border border-primary/20 shadow-lg">
        {/* Enhanced plan header with better visual hierarchy */}
        <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/90 px-4 py-3 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isMonthlyPlan ? (
                <Clock className="h-5 w-5 text-primary" />
              ) : (
                <Diamond className="h-5 w-5 text-blue-400" />
              )}
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">מנוי {planDetails.name}</span>
                
                {isMonthlyPlan && (
                  <Badge className="bg-primary text-white hover:bg-primary py-0.5 animate-pulse-subtle">
                    הכי פופולרי
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-1">
              {planDetails.price}<span className="text-xs text-slate-300 mr-1">/חודש</span>
            </div>
          </div>
          
          {/* Updated social proof with trader selection instead of user count */}
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-300 justify-end">
            <span>נבחר בקפידה על ידי סוחרים מנוסים</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />
              ))}
            </div>
          </div>
        </div>
        
        {/* Plan description with improved typography */}
        <div className="px-4 py-3 text-right bg-slate-700/20">
          <p className="text-slate-300 text-sm">{planDetails.description}</p>
        </div>
        
        {/* Enhanced features with visual grouping and better hierarchy */}
        <div className="px-4 py-4 bg-slate-700/30 border-t border-slate-600/40">
          <h4 className="text-sm font-medium text-white mb-3 text-right">יתרונות המנוי:</h4>
          <div className="grid grid-cols-1 gap-4">
            <FeatureItem 
              icon={<Shield className="h-4.5 w-4.5 text-cyan-400" />}
              title="גישה מלאה לכל התכונות"
              description="כל הכלים, הקורסים והמשאבים שלנו ללא הגבלה"
              highlighted
            />
            <FeatureItem 
              icon={<Clock className="h-4.5 w-4.5 text-green-400" />}
              title="ביטול בכל עת, ללא התחייבות"
              description="שליטה מלאה בידיים שלך - תוכל לבטל מתי שתרצה"
              highlighted
            />
            <FeatureItem 
              icon={<Users className="h-4.5 w-4.5 text-blue-400" />}
              title="תמיכה אישית מהמומחים שלנו"
              description="צוות מקצועי זמין לכל שאלה ובעיה"
            />
            
            {isMonthlyPlan && (
              <div className="flex items-center gap-2 justify-end text-sm mt-1">
                <div className={cn(
                  "flex items-center gap-2 py-2 px-4 rounded-md",
                  "bg-primary/20 border border-primary/30 shadow-sm hover:shadow transition-all",
                  "text-primary font-medium text-sm animate-pulse-subtle"
                )}>
                  <span>חודש ניסיון חינם</span>
                  <Gift className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Enhanced payment info section with better spacing */}
        <div className="px-4 py-3 bg-slate-700/50 border-t border-slate-600/40">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 text-right font-medium opacity-80">
              {isMonthlyPlan ? 'החיוב הראשון לאחר 30 יום' : 'חיוב מיידי'}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              <span>שליטה מלאה בידיים שלך</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2 text-xs text-center text-slate-400 opacity-70">
            ללא התחייבות. תוכל לבטל בכל רגע.
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
  <div className="flex items-start justify-end">
    <div className="text-right">
      <div className="flex items-center justify-end gap-1.5">
        <span className={cn(
          "font-medium", 
          highlighted ? "text-white text-sm" : "text-slate-200 text-sm"
        )}>
          {title}
        </span>
        <CheckCircle className={cn(
          "h-4 w-4 flex-shrink-0",
          highlighted ? "text-primary" : "text-green-400"
        )} />
      </div>
      <p className="text-xs text-slate-400 mt-0.5 pr-6">
        {description}
      </p>
    </div>
    <div className="ml-2 mt-0.5 bg-slate-700/50 p-1.5 rounded-md">
      {icon}
    </div>
  </div>
);

export default PlanDetailsSummary;
