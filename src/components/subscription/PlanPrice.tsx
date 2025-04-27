
import React from 'react';
import { CircleDollarSign } from 'lucide-react';

interface PlanPriceProps {
  price: number;
  className?: string;
}

export const PlanPrice: React.FC<PlanPriceProps> = ({ price, className = '' }) => {
  const formattedPrice = new Intl.NumberFormat('he-IL').format(price);
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span>₪</span>
      <span>{formattedPrice}</span>
    </div>
  );
};
