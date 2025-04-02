
import React from 'react';
import { Calendar, Settings } from 'lucide-react';

interface BillingInfoProps {
  nextBillingDate: string;
  planPrice: string;
}

const BillingInfo: React.FC<BillingInfoProps> = ({ 
  nextBillingDate, 
  planPrice 
}) => {
  return (
    <>
      <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
        <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium">החיוב הבא</h4>
          <p className="text-sm text-muted-foreground">{nextBillingDate}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
        <Settings className="h-5 w-5 text-primary flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium">סכום החיוב</h4>
          <p className="text-sm text-muted-foreground">₪{planPrice} בתאריך {nextBillingDate}</p>
        </div>
      </div>
    </>
  );
};

export default BillingInfo;
