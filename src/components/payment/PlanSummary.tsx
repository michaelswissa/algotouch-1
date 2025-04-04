
import React from 'react';
import { Check } from 'lucide-react';

interface PlanSummaryProps {
  planName: string;
  price: string | number;  // Updated to accept both string and number
  description: string;
  hasTrial?: boolean;
}

const PlanSummary: React.FC<PlanSummaryProps> = ({ 
  planName,
  price,
  description,
  hasTrial = false
}) => {
  // Format price for display
  const formattedPrice = typeof price === 'number' ? `$${price}` : price;
  
  return (
    <div className="flex flex-col items-center text-center">
      <h3 className="text-xl font-bold mb-1">מנוי {planName}</h3>
      <div className="flex items-baseline mb-2">
        <span className="text-2xl font-bold">{formattedPrice}</span>
        {planName === 'חודשי' && <span className="text-muted-foreground text-sm mr-1">/ לחודש</span>}
        {planName === 'שנתי' && <span className="text-muted-foreground text-sm mr-1">/ לשנה</span>}
      </div>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      
      {hasTrial && (
        <div className="bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-lg p-2 w-full mb-2 flex items-center">
          <Check className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
          <span className="text-sm">חודש ראשון ללא תשלום</span>
        </div>
      )}
    </div>
  );
};

export default PlanSummary;
