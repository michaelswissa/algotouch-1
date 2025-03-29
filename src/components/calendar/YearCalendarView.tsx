
import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Calendar as CalendarIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

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
  currentMonth?: number;
}

const YearCalendarView: React.FC<YearCalendarViewProps> = ({ 
  year, 
  months, 
  onMonthSelect,
  selectedMonth,
  currentMonth = new Date().getMonth()
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
    <div className="w-full animate-fade-in">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-semibold text-gradient-blue">{year}</h3>
      </div>
      
      {/* Legend for calendar */}
      <div className="flex items-center justify-center gap-6 mb-5 text-sm bg-card p-3 rounded-md shadow-sm border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-200 rounded-sm"></div>
          <span className="font-medium">רווח</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded-sm"></div>
          <span className="font-medium">הפסד</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-50 border border-slate-200 rounded-sm"></div>
          <span className="font-medium">ללא פעילות</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {months.map((month, index) => (
          <TooltipProvider key={month.name}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  onClick={() => month.hasTradeData && onMonthSelect(index)}
                  className={cn(
                    "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
                    month.profit > 0 
                      ? "bg-green-50 border-green-200 hover:bg-green-100/80 dark:bg-green-950/20 dark:border-green-800/30" 
                      : month.profit < 0 
                        ? "bg-red-50 border-red-200 hover:bg-red-100/80 dark:bg-red-950/20 dark:border-red-800/30" 
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 dark:bg-slate-900/20 dark:border-slate-800/30",
                    selectedMonth === index && "ring-2 ring-primary border-primary",
                    index === currentMonth && selectedMonth !== index && "ring-1 ring-blue-400 dark:ring-blue-500",
                    !month.hasTradeData && "opacity-70 cursor-not-allowed",
                  )}
                >
                  <div className="relative">
                    {index === currentMonth && 
                      <Badge className="absolute top-0 right-0 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                        חודש נוכחי
                      </Badge>
                    }
                    <h4 className="text-lg font-bold text-center mb-2">{month.name}</h4>
                    
                    {month.hasTradeData ? (
                      <>
                        <div className={cn(
                          "text-center font-semibold flex items-center justify-center gap-1 mb-3",
                          month.profit > 0 ? "text-green-600 dark:text-green-400" : 
                          month.profit < 0 ? "text-red-600 dark:text-red-400" : "text-slate-600"
                        )}>
                          {formatProfit(month.profit)}
                          {month.profit > 0 ? 
                            <ArrowUp size={16} /> : 
                            month.profit < 0 ? <ArrowDown size={16} /> : null}
                        </div>
                        <div className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            <CalendarIcon size={12} className="mr-1" /> {Math.floor(Math.random() * 20) + 1} עסקאות
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground py-2">
                        אין נתוני מסחר
                      </div>
                    )}
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                {month.hasTradeData ? (
                  <div>
                    <p className="font-bold">{month.name} {year}</p>
                    <div className="text-sm mt-1">
                      <p>{month.profit > 0 ? "רווח נטו: " : "הפסד נטו: "} {formatProfit(month.profit)}</p>
                      <p>לחץ לצפייה בפירוט החודש</p>
                    </div>
                  </div>
                ) : (
                  <p>אין נתוני מסחר לחודש זה</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
};

export default YearCalendarView;
