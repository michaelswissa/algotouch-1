
import React from 'react';
import { BadgeShekel } from 'lucide-react';

interface PlanPriceProps {
  price: number;
  className?: string;
}

export const PlanPrice: React.FC<PlanPriceProps> = ({ price, className = '' }) => {
  const formattedPrice = new Intl.NumberFormat('he-IL').format(price);
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <BadgeShekel className="h-4 w-4" />
      <span>{formattedPrice}</span>
    </div>
  );
};
