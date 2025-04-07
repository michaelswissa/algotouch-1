
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
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border-2 border-primary/30 shadow-lg hover:shadow-xl transition-all">
      <div className="flex items-center justify-between">
        <div className="flex-grow">
          <h3 className="text-xl font-bold mb-1 text-primary">{planName}</h3>
          <p className="text-sm text-foreground mb-3">{description}</p>
          
          {hasTrial && (
            <div className="flex items-center text-sm text-green-600 font-medium mt-1 bg-green-100 px-3 py-1.5 rounded-full w-fit">
              <CheckCircle className="h-4 w-4 mr-2" />
              <span>חודש ראשון ללא תשלום</span>
            </div>
          )}
        </div>
        
        <div className="text-right bg-primary/10 p-3 rounded-lg">
          <div className="text-2xl font-bold text-primary">{currency}{price}</div>
          <div className="text-xs font-medium text-muted-foreground">
            {hasTrial ? 'לאחר תקופת הניסיון' : 'סה״כ לתשלום'}
          </div>
        </div>
      </div>
      
      {!hasTrial && (
        <div className="flex items-center text-sm mt-3 text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-full w-fit">
          <CheckCircle className="h-4 w-4 mr-2" />
          <span>חיוב מיידי</span>
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-primary/20">
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
  <div className="flex items-center bg-primary/5 px-2 py-1 rounded-md">
    <CheckCircle className="h-3.5 w-3.5 text-primary mr-2" />
    <span className="text-xs font-medium">{text}</span>
  </div>
);

export default PlanSummary;
