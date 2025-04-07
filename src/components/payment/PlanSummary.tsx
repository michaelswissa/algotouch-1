
import React from 'react';
import { CheckCircle } from 'lucide-react';

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
    <div className="bg-muted/30 p-5 rounded-lg border border-border/50 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-grow">
          <h3 className="text-xl font-semibold mb-1">{planName}</h3>
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
          
          {hasTrial && (
            <div className="flex items-center text-sm text-green-600 font-medium mt-1">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>חודש ראשון ללא תשלום</span>
            </div>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{currency}{price}</div>
          <div className="text-xs text-muted-foreground">
            {hasTrial ? 'לאחר תקופת הניסיון' : 'סה״כ לתשלום'}
          </div>
        </div>
      </div>
      
      {!hasTrial && (
        <div className="flex items-center text-sm mt-3 text-primary font-medium">
          <CheckCircle className="h-4 w-4 mr-1" />
          <span>חיוב מיידי</span>
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-border/30">
        <div className="flex flex-wrap gap-4">
          <PlanFeature text="תשלום מאובטח" />
          <PlanFeature text="גישה מיידית" />
          <PlanFeature text="ביטול בכל עת" />
        </div>
      </div>
    </div>
  );
};

const PlanFeature = ({ text }: { text: string }) => (
  <div className="flex items-center">
    <CheckCircle className="h-3.5 w-3.5 text-primary mr-1" />
    <span className="text-xs">{text}</span>
  </div>
);

export default PlanSummary;
