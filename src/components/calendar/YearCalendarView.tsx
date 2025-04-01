
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradingDataStore } from '@/stores/trading-data-store';

interface YearCalendarViewProps {
  year: number;
  onMonthSelect: (month: string) => void;
}

export const YearCalendarView = ({ year, onMonthSelect }: YearCalendarViewProps) => {
  // Hebrew month names
  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  
  // Get trading data from store
  const { globalTrades } = useTradingDataStore();
  
  // Process trades to calculate monthly stats
  const getMonthlyData = () => {
    // Initialize array with empty data for all months
    const monthsData = hebrewMonths.map(name => ({
      name,
      value: 0,
      trades: 0
    }));
    
    if (globalTrades.length === 0) {
      return monthsData;
    }
    
    // Calculate values for each month
    globalTrades.forEach(trade => {
      const entryDate = new Date(trade['Entry DateTime']);
      const tradeYear = entryDate.getFullYear();
      
      // Only process trades from the selected year
      if (tradeYear === year) {
        const monthIndex = entryDate.getMonth();
        monthsData[monthIndex].trades += 1;
        monthsData[monthIndex].value += trade.Net || 0;
      }
    });
    
    return monthsData;
  };
  
  const monthsData = getMonthlyData();
  
  // Current month
  const currentMonth = new Date().getMonth();
  
  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4 text-center">{year} - תצוגת שנה</h2>
      <div className="grid grid-cols-3 gap-4" dir="rtl">
        {monthsData.map((month, index) => (
          <Card 
            key={index} 
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
              month.value > 0 ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/40" : 
              month.value < 0 ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/40" : 
              "bg-card",
              index === currentMonth && "ring-2 ring-primary"
            )}
            onClick={() => onMonthSelect(month.name)}
          >
            <CardContent className="p-4">
              <h3 className="text-lg font-bold text-center mb-2">{month.name}</h3>
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-muted-foreground">עסקאות:</span> {month.trades}
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-sm",
                  month.value > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : 
                  month.value < 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : 
                  "bg-secondary/50 text-secondary-foreground"
                )}>
                  {month.value > 0 ? (
                    <>
                      <ArrowUp size={14} />
                      <span>{month.value.toFixed(2)}₪</span>
                    </>
                  ) : month.value < 0 ? (
                    <>
                      <ArrowDown size={14} />
                      <span>{Math.abs(month.value).toFixed(2)}₪</span>
                    </>
                  ) : (
                    <span>0.00₪</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
