
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
  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium">{year}</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {months.map((month, index) => (
          <Card 
            key={month.name}
            onClick={() => onMonthSelect(index)}
            className={cn(
              "p-3 cursor-pointer transition-all duration-200 hover:shadow-md text-center",
              month.profit > 0 ? "bg-tradervue-light-green hover:bg-tradervue-light-green/80" : 
              month.profit < 0 ? "bg-tradervue-light-red hover:bg-tradervue-light-red/80" : 
              "bg-secondary/20 hover:bg-secondary/30",
              selectedMonth === index && "ring-2 ring-primary",
              !month.hasTradeData && "opacity-50"
            )}
          >
            <div className="font-medium mb-1">{month.name}</div>
            {month.hasTradeData && (
              <div className={cn(
                "text-sm font-semibold",
                month.profit > 0 ? "text-tradervue-green" : 
                month.profit < 0 ? "text-tradervue-red" : ""
              )}>
                {month.profit > 0 ? `+${month.profit.toFixed(2)}$` : 
                month.profit < 0 ? `${month.profit.toFixed(2)}$` : '0.00$'}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default YearCalendarView;
