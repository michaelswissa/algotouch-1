
import React from 'react';
import { cn } from '@/lib/utils';
import { TradeRecord } from '@/lib/trade-analysis';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CalendarDay {
  day: number;
  month: 'current' | 'prev' | 'next';
  status?: 'positive' | 'negative' | 'neutral';
  isToday?: boolean;
}

interface CalendarGridProps {
  daysOfWeek: string[];
  calendarDays: CalendarDay[];
  onDayClick: (day: number, month: 'current' | 'prev' | 'next') => void;
  selectedDay?: string | null;
  tradesData?: Record<string, TradeRecord[]>;
}

const CalendarGrid = ({ daysOfWeek, calendarDays, onDayClick, selectedDay, tradesData = {} }: CalendarGridProps) => {
  // Function to get trade count for a specific day
  const getTradeCount = (day: number, month: 'current' | 'prev' | 'next'): number => {
    const dayKey = `${day}-${month}`;
    return tradesData[dayKey]?.length || 0;
  };

  // Calculate daily profit/loss
  const getDailyPnL = (day: number, month: 'current' | 'prev' | 'next'): number => {
    const dayKey = `${day}-${month}`;
    const trades = tradesData[dayKey] || [];
    return trades.reduce((total, trade) => total + (trade.Net || 0), 0);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1 mb-1 text-center" dir="rtl">
        {daysOfWeek.map((day, index) => (
          <div key={index} className="py-2 text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center" dir="rtl">
        {calendarDays.map((dayObj, index) => {
          const dayKey = `${dayObj.day}-${dayObj.month}`;
          const isSelected = selectedDay === dayKey;
          const tradeCount = getTradeCount(dayObj.day, dayObj.month);
          const dailyPnL = getDailyPnL(dayObj.day, dayObj.month);
          
          return (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => onDayClick(dayObj.day, dayObj.month)}
                    className={cn(
                      "py-2 relative rounded-md cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[60px]",
                      dayObj.month === 'current'
                        ? "font-medium hover:bg-secondary/50"
                        : "text-muted-foreground opacity-40 hover:opacity-60",
                      dayObj.isToday && "border-2 border-primary",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                      !isSelected && dayObj.status === 'positive' && "bg-green-50/70 dark:bg-green-950/20",
                      !isSelected && dayObj.status === 'negative' && "bg-red-50/70 dark:bg-red-950/20",
                      dayObj.month === 'current' && !dayObj.status && "bg-slate-50/70 dark:bg-slate-950/10"
                    )}
                  >
                    <span className={cn(
                      "text-md",
                      isSelected 
                        ? "text-primary-foreground" 
                        : dayObj.status === 'positive' 
                          ? "text-green-600 dark:text-green-400" 
                          : dayObj.status === 'negative' 
                            ? "text-red-600 dark:text-red-400" 
                            : ""
                    )}>
                      {dayObj.day}
                    </span>
                    
                    {tradeCount > 0 && dayObj.month === 'current' && (
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "text-xs mt-1 px-1.5 py-0.5 rounded-full",
                          isSelected 
                            ? "bg-white/20 text-white" 
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        )}>
                          {tradeCount}
                        </div>
                        {dailyPnL !== 0 && (
                          <div className="mt-1 flex items-center">
                            {dailyPnL > 0 ? (
                              <ArrowUp size={12} className="text-green-600" />
                            ) : (
                              <ArrowDown size={12} className="text-red-600" />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {dayObj.month === 'current' ? (
                    <div>
                      <p className="font-bold">יום {dayObj.day}</p>
                      {tradeCount > 0 ? (
                        <>
                          <p className="text-sm">{tradeCount} עסקאות</p>
                          <p className={cn(
                            "text-sm",
                            dailyPnL > 0 ? "text-green-600" : dailyPnL < 0 ? "text-red-600" : ""
                          )}>
                            {dailyPnL > 0 ? `רווח: ${dailyPnL.toFixed(2)}₪` : 
                             dailyPnL < 0 ? `הפסד: ${Math.abs(dailyPnL).toFixed(2)}₪` : 
                             'אין רווח/הפסד'}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm">אין עסקאות</p>
                      )}
                      <p className="text-xs mt-1 text-muted-foreground">לחץ להצגת פרטים</p>
                    </div>
                  ) : (
                    <p>חודש {dayObj.month === 'prev' ? 'קודם' : 'הבא'}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
