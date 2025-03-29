
import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MonthData {
  name: string;
  value: number;
  profit: number;
  hasTradeData: boolean;
}

interface YearCalendarViewProps {
  year: number;
  months: MonthData[];
  onMonthSelect: (monthIndex: number) => void;
  selectedMonth: number | null;
}

const YearCalendarView: React.FC<YearCalendarViewProps> = ({ 
  year, 
  months, 
  onMonthSelect,
  selectedMonth
}) => {
  // Format profit value with NIS symbol (₪)
  const formatProfit = (profit: number) => {
    const formattedValue = Math.abs(profit).toFixed(2);
    return profit > 0 
      ? `+${formattedValue}₪` 
      : profit < 0 
        ? `-${formattedValue}₪` 
        : '0.00₪';
  };

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-semibold">{year}</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {months.map((month, index) => (
          <Card 
            key={month.name}
            onClick={() => month.hasTradeData && onMonthSelect(index)}
            className={cn(
              "py-4 px-3 cursor-pointer transition-all duration-200 border-2",
              month.profit > 0 
                ? "bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300" 
                : month.profit < 0 
                  ? "bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300" 
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300",
              selectedMonth === index && "ring-2 ring-primary border-primary",
              !month.hasTradeData && "opacity-60 cursor-not-allowed"
            )}
          >
            <div className="font-bold text-center mb-2 text-lg">{month.name}</div>
            {month.hasTradeData && (
              <div className={cn(
                "text-center font-semibold",
                month.profit > 0 ? "text-green-600" : 
                month.profit < 0 ? "text-red-600" : "text-slate-600"
              )}>
                {formatProfit(month.profit)}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default YearCalendarView;
