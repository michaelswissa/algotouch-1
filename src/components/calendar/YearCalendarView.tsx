
import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Info, Zap, Calendar as CalendarIcon } from 'lucide-react';
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
      
      {/* Modern legend for calendar */}
      <div className="flex items-center justify-center gap-4 mb-6 text-sm bg-secondary/30 p-3 rounded-md shadow-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 transition-all hover:scale-105">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-sm"></div>
                <span className="font-medium">רווח</span>
                <ArrowUp size={14} className="text-green-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>חודשים עם רווח נטו חיובי</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 transition-all hover:scale-105">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded-sm"></div>
                <span className="font-medium">הפסד</span>
                <ArrowDown size={14} className="text-red-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>חודשים עם רווח נטו שלילי</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 transition-all hover:scale-105">
                <div className="w-3 h-3 bg-slate-100 border border-slate-300 rounded-sm"></div>
                <span className="font-medium">ללא פעילות</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>חודשים ללא פעילות מסחר</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="grid grid-cols-3 gap-5">
        {months.map((month, index) => (
          <TooltipProvider key={month.name}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  onClick={() => month.hasTradeData && onMonthSelect(index)}
                  className={cn(
                    "py-4 px-3 cursor-pointer transition-all duration-200",
                    month.profit > 0 
                      ? "bg-green-50/70 border-green-200 hover:bg-green-100/80 hover:border-green-300 dark:bg-green-950/20 dark:border-green-800/30 dark:hover:bg-green-900/30" 
                      : month.profit < 0 
                        ? "bg-red-50/70 border-red-200 hover:bg-red-100/80 hover:border-red-300 dark:bg-red-950/20 dark:border-red-800/30 dark:hover:bg-red-900/30" 
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300 dark:bg-slate-900/20 dark:border-slate-800/30 dark:hover:bg-slate-800/40",
                    selectedMonth === index && "ring-2 ring-primary border-primary",
                    index === currentMonth && !selectedMonth && "ring-2 ring-secondary-foreground",
                    !month.hasTradeData && "opacity-60 cursor-not-allowed",
                    "shadow-sm hover:shadow-md"
                  )}
                >
                  <div className="font-bold text-center mb-2 text-lg">
                    {index === currentMonth && 
                      <Badge variant="outline" className="absolute top-2 right-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px]">חודש נוכחי</Badge>
                    }
                    {month.name}
                  </div>
                  {month.hasTradeData && (
                    <>
                      <div className={cn(
                        "text-center font-semibold flex items-center justify-center gap-1",
                        month.profit > 0 ? "text-green-600 dark:text-green-400" : 
                        month.profit < 0 ? "text-red-600 dark:text-red-400" : "text-slate-600"
                      )}>
                        {formatProfit(month.profit)}
                        {month.profit > 0 ? 
                          <ArrowUp size={16} className="animate-sine-move" /> : 
                          month.profit < 0 ? <ArrowDown size={16} className="animate-sine-move" /> : null}
                      </div>
                      <div className="mt-3 text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          <CalendarIcon size={12} className="mr-1" /> {Math.floor(Math.random() * 20) + 1} עסקאות
                        </Badge>
                      </div>
                    </>
                  )}
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
