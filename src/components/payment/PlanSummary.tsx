
import React from 'react';

interface PlanSummaryProps {
  planName: string;
  price: number;
  description: string;
}

const PlanSummary: React.FC<PlanSummaryProps> = ({ planName, price, description }) => {
  return (
    <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg">
      <div>
        <h3 className="font-medium">מנוי {planName}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="text-right">
        <span className="text-2xl font-bold">₪{price}</span>
        <p className="text-xs text-muted-foreground">לאחר חודש ניסיון חינם</p>
      </div>
    </div>
  );
};

export default PlanSummary;
