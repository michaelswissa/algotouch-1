
import React from 'react';
import { CheckCircle, Gift, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlanSummaryProps {
  planName: string;
  price: number;
  description: string;
  hasTrial?: boolean;
  currency?: string;
}

const PlanSummary: React.FC<PlanSummaryProps> = ({ 
  planName, 
  price, 
  description,
  hasTrial = false,
  currency = '$' 
}) => {
  return (
    <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border-2 border-primary/30 shadow-xl transition-all hover:shadow-2xl">
      <div className="p-5 pb-3">
        {/* Header with plan name and price */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-grow">
            <h3 className="text-2xl font-bold text-primary mb-1">{planName}</h3>
            <p className="text-sm text-foreground mb-3">{description}</p>
            
            {hasTrial && (
              <Badge variant="secondary" className="bg-green-600/20 text-green-700 dark:bg-green-500/30 dark:text-green-400 border border-green-600/30 px-3 py-1 flex items-center gap-1.5 animate-pulse-subtle">
                <Gift className="h-3.5 w-3.5" />
                <span>חודש ראשון ללא תשלום</span>
              </Badge>
            )}
          </div>
          
          <div className="text-right bg-primary/15 border border-primary/30 p-3 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-200">
            <div className="text-2xl font-black text-primary">{currency}{price}</div>
            <div className="text-xs text-muted-foreground">
              {hasTrial ? 'לאחר תקופת הניסיון' : 'סה״כ לתשלום'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Features and benefits section */}
      <div className="px-5 pt-3 pb-5">
        {/* Payment schedule info */}
        {!hasTrial ? (
          <div className="flex items-center gap-2 mb-4 text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-full w-fit border border-primary/20">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">חיוב מיידי</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4 text-purple-600 font-medium bg-purple-500/10 px-3 py-1.5 rounded-full w-fit border border-purple-500/20">
            <Gift className="h-4 w-4" />
            <span className="text-sm">החיוב הראשון לאחר 30 יום</span>
          </div>
        )}
        
        {/* Key benefits and features */}
        <div className="mt-4 pt-4 border-t border-primary/20">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <PlanFeature text="גישה מלאה" />
            <PlanFeature text="ביטול בכל עת" />
            <PlanFeature text="תשלום מאובטח" />
          </div>
        </div>
      </div>
    </div>
  );
};

const PlanFeature = ({ text }: { text: string }) => (
  <div className="flex items-center bg-primary/10 px-2.5 py-1.5 rounded-md border border-primary/20">
    <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2 flex-shrink-0" />
    <span className="text-xs font-medium">{text}</span>
  </div>
);

export default PlanSummary;
