
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthData {
  name: string;
  value: number;
  trades: number;
}

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
  
  // Mock data for months
  const monthsData: MonthData[] = [
    { name: 'ינואר', value: 1250.75, trades: 12 },
    { name: 'פברואר', value: -450.25, trades: 8 },
    { name: 'מרץ', value: 780.50, trades: 15 },
    { name: 'אפריל', value: 1450.30, trades: 20 },
    { name: 'מאי', value: -320.10, trades: 6 },
    { name: 'יוני', value: 650.90, trades: 11 },
    { name: 'יולי', value: -150.40, trades: 5 },
    { name: 'אוגוסט', value: 920.80, trades: 14 },
    { name: 'ספטמבר', value: 670.20, trades: 9 },
    { name: 'אוקטובר', value: 1100.60, trades: 17 },
    { name: 'נובמבר', value: 580.30, trades: 10 },
    { name: 'דצמבר', value: 0, trades: 0 },
  ];
  
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
