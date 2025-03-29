
import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Info, Zap } from 'lucide-react';
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
      <div className="text-center mb-4">
        <h3 className="text-2xl font-semibold">{year}</h3>
      </div>
      
      {/* Legend for calendar */}
      <div className="flex items-center justify-center gap-4 mb-6 text-sm bg-secondary/30 p-2 rounded-md">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-sm"></div>
                <span>רווח</span>
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
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded-sm"></div>
                <span>הפסד</span>
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
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-slate-100 border border-slate-300 rounded-sm"></div>
                <span>ללא פעילות</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>חודשים ללא פעילות מסחר</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {months.map((month, index) => (
          <TooltipProvider key={month.name}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  onClick={() => month.hasTradeData && onMonthSelect(index)}
                  className={cn(
                    "py-4 px-3 cursor-pointer transition-all duration-200 border-2",
                    month.profit > 0 
                      ? "bg-green-50/70 border-green-200 hover:bg-green-100 hover:border-green-300" 
                      : month.profit < 0 
                        ? "bg-red-50/70 border-red-200 hover:bg-red-100 hover:border-red-300" 
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300",
                    selectedMonth === index && "ring-2 ring-primary border-primary",
                    !month.hasTradeData && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="font-bold text-center mb-2 text-lg">{month.name}</div>
                  {month.hasTradeData && (
                    <>
                      <div className={cn(
                        "text-center font-semibold flex items-center justify-center gap-1",
                        month.profit > 0 ? "text-green-600" : 
                        month.profit < 0 ? "text-red-600" : "text-slate-600"
                      )}>
                        {formatProfit(month.profit)}
                        {month.profit > 0 ? <ArrowUp size={14} /> : month.profit < 0 ? <ArrowDown size={14} /> : null}
                      </div>
                      <div className="mt-2 text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <Zap size={12} className="mr-1" /> {Math.floor(Math.random() * 20) + 1} עסקאות
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
