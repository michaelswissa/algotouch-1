
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CardExpiryInputsProps {
  expiryMonth: string;
  expiryYear: string;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  error?: string;
}

const CardExpiryInputs: React.FC<CardExpiryInputsProps> = ({
  expiryMonth,
  expiryYear,
  onMonthChange,
  onYearChange,
  error
}) => {
  // Generate months (01-12)
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return month.toString().padStart(2, '0');
  });
  
  // Generate years (current year to 10 years ahead)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => {
    return (currentYear + i).toString();
  });
  
  return (
    <div className="space-y-2">
      <Label>תוקף כרטיס</Label>
      <div className="flex space-x-2 flex-row-reverse">
        <div className="flex-1">
          <Select name="expirationMonth" value={expiryMonth} onValueChange={onMonthChange}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder="חודש" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={`month-${month}`} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Select name="expirationYear" value={expiryYear} onValueChange={onYearChange}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder="שנה" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={`year-${year}`} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default CardExpiryInputs;
