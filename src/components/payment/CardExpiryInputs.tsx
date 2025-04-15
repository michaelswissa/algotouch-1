
import React from 'react';
import { Label } from '@/components/ui/label';

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
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry-month">חודש תפוגה</Label>
          <select
            id="expiry-month"
            className={`w-full h-10 rounded-md border bg-background px-3 py-2 ${
              error ? 'border-red-500' : 'border-input'
            }`}
            value={expiryMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            required
          >
            <option value="" disabled>חודש</option>
            {Array.from({ length: 12 }, (_, i) => {
              const month = (i + 1).toString().padStart(2, '0');
              return (
                <option key={month} value={month}>
                  {month}
                </option>
              );
            })}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiry-year">שנת תפוגה</Label>
          <select
            id="expiry-year"
            className={`w-full h-10 rounded-md border bg-background px-3 py-2 ${
              error ? 'border-red-500' : 'border-input'
            }`}
            value={expiryYear}
            onChange={(e) => onYearChange(e.target.value)}
            required
          >
            <option value="" disabled>שנה</option>
            {Array.from({ length: 10 }, (_, i) => {
              const year = (new Date().getFullYear() + i).toString().slice(2);
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default CardExpiryInputs;
