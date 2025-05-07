
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
  currency = '₪' 
}) => {
  return (
    <div className="bg-card border border-primary/20 rounded-xl shadow-md hover:shadow-lg transition-all">
      <div className="p-5 pb-3">
        {/* Header with plan name and price */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-grow">
            <h3 className="text-2xl font-bold text-foreground mb-1">{planName}</h3>
            <p className="text-sm text-muted-foreground mb-3">{description}</p>
            
            {hasTrial && (
              <Badge variant="secondary" className="bg-green-600/10 text-green-600 border border-green-600/20 px-3 py-1 flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5" />
                <span>חודש ראשון ללא תשלום</span>
              </Badge>
            )}
          </div>
          
          <div className="text-right bg-primary/10 border border-primary/20 p-3 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-foreground">{currency}{price}</div>
            <div className="text-xs text-muted-foreground">
              {hasTrial ? 'לאחר תקופת הניסיון' : 'סה״כ לתשלום'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Features and benefits section */}
      <div className="px-5 pt-2 pb-4">
        {/* Payment schedule info */}
        {!hasTrial ? (
          <div className="flex items-center gap-2 mb-4 text-foreground font-medium bg-background/80 px-3 py-1.5 rounded-full w-fit border border-border">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">חיוב מיידי</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4 text-purple-600 font-medium bg-purple-500/5 px-3 py-1.5 rounded-full w-fit border border-purple-500/10">
            <Gift className="h-4 w-4" />
            <span className="text-sm">החיוב הראשון לאחר 30 יום</span>
          </div>
        )}
        
        {/* Key benefits and features */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
  <div className="flex items-center bg-background/50 px-2.5 py-1.5 rounded-md border border-border/50">
    <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2 flex-shrink-0" />
    <span className="text-xs font-medium">{text}</span>
  </div>
);

export default PlanSummary;
