
import React from 'react';
import { Label } from '@/components/ui/label';
import { FormMessage } from '@/components/ui/form';

interface CardExpiryInputsProps {
  expiryMonth: string;
  expiryYear: string;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  error?: string;
}

const CardExpiryInputs: React.FC<CardExpiryInputsProps> = ({
  expiryMonth,
  expiryYear,
  onMonthChange,
  onYearChange,
  error
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => currentYear + i);

  return (
    <div className="space-y-2">
      <Label>תוקף הכרטיס</Label>
      <div className="flex gap-2">
        <div className="w-1/2">
          <Label htmlFor="expirationMonth" className="text-xs">חודש</Label>
          <select 
            id="expirationMonth"
            name="expirationMonth"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={expiryMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            required
          >
            <option value="">חודש</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={String(month).padStart(2, '0')}>
                {String(month).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
        
        <div className="w-1/2">
          <Label htmlFor="expirationYear" className="text-xs">שנה</Label>
          <select 
            id="expirationYear"
            name="expirationYear"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={expiryYear}
            onChange={(e) => onYearChange(e.target.value)}
            required
          >
            <option value="">שנה</option>
            {years.map(year => (
              <option key={year} value={String(year).slice(-2)}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {error && (
        <FormMessage>{error}</FormMessage>
      )}
    </div>
  );
};

export default CardExpiryInputs;
