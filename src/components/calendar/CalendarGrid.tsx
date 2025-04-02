
import React from 'react';
import { cn } from '@/lib/utils';
import { TradeRecord } from '@/lib/trade-analysis';
import { ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { getTradeCount, getDailyPnL, getTradesPreview } from './TradeUtils';

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
  return (
    <div className="w-full mt-2">
      <div className="grid grid-cols-7 gap-1 mb-1 text-center" dir="rtl">
        {daysOfWeek.map((day, index) => (
          <div key={index} className="py-2 text-sm font-medium text-secondary-foreground bg-secondary/30 rounded-sm">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2 text-center" dir="rtl">
        {calendarDays.map((dayObj, index) => {
          // Always format the day key consistently
          const dayKey = dayObj.month === 'current' ? `${dayObj.day}-current` : `${dayObj.day}-${dayObj.month}`;
          const isSelected = selectedDay === dayKey;
          const tradeCount = getTradeCount(dayObj.day, dayObj.month, tradesData);
          const dailyPnL = getDailyPnL(dayObj.day, dayObj.month, tradesData);
          const hasTrades = tradeCount > 0 && dayObj.month === 'current';
          
          // Show prev/next month days with low opacity
          const isPrevOrNextMonth = dayObj.month !== 'current';
          
          return (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => onDayClick(dayObj.day, dayObj.month)}
                    className={cn(
                      "relative rounded-md cursor-pointer transition-all duration-200 flex flex-col items-center justify-start min-h-[75px] border shadow-sm",
                      isPrevOrNextMonth
                        ? "text-muted-foreground opacity-40 hover:opacity-60 bg-muted/30 border-muted hover:bg-muted/50"
                        : "hover:shadow-md hover:border-primary/50",
                      dayObj.isToday && !isSelected && "ring-2 ring-primary",
                      isSelected && "bg-primary/10 border-primary ring-1 ring-primary/50 shadow-md",
                      !isSelected && hasTrades && dailyPnL > 0 && "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/40",
                      !isSelected && hasTrades && dailyPnL < 0 && "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/40",
                      !isSelected && dayObj.month === 'current' && !hasTrades && "bg-card border-border/60"
                    )}
                  >
                    <span className={cn(
                      "text-md mt-2 font-medium",
                      isSelected 
                        ? "text-primary" 
                        : ""
                    )}>
                      {dayObj.day}
                    </span>
                    
                    {hasTrades && (
                      <div className="flex flex-col gap-1 mt-2 w-full items-center">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full",
                            isSelected 
                              ? "bg-primary/20 text-primary border-primary/30" 
                              : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/40"
                          )}
                        >
                          {tradeCount}
                        </Badge>
                        
                        {dailyPnL !== 0 && (
                          <div className={cn(
                            "flex items-center text-xs mt-1 gap-1 px-1.5 py-0.5 rounded-full",
                            dailyPnL > 0 
                              ? "text-green-700 bg-green-100/70 dark:text-green-400 dark:bg-green-900/30" 
                              : "text-red-700 bg-red-100/70 dark:text-red-400 dark:bg-red-900/30"
                          )}>
                            {dailyPnL > 0 ? (
                              <ArrowUp size={10} className="inline" />
                            ) : (
                              <ArrowDown size={10} className="inline" />
                            )}
                            <span>${Math.abs(dailyPnL).toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="p-2 max-w-xs">
                  {dayObj.month === 'current' ? (
                    <div>
                      <div className="font-bold border-b border-gray-200 dark:border-gray-700 pb-1 mb-1 flex items-center gap-2">
                        <Calendar size={14} className="text-primary" />
                        <span>יום {dayObj.day}</span>
                      </div>
                      
                      {hasTrades ? (
                        <>
                          <div className="text-sm py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="font-medium">{tradeCount} עסקאות</span>
                            <span className={cn(
                              "mx-2 px-1.5 py-0.5 rounded text-xs",
                              dailyPnL > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : 
                              dailyPnL < 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : ""
                            )}>
                              {dailyPnL > 0 ? `רווח: $${dailyPnL.toFixed(2)}` : 
                               dailyPnL < 0 ? `הפסד: $${Math.abs(dailyPnL).toFixed(2)}` : 
                               'אין רווח/הפסד'}
                            </span>
                          </div>
                          
                          <div className="mt-1">
                            {getTradesPreview(dayObj.day, dayObj.month, tradesData)}
                            {tradeCount > 3 && (
                              <div className="text-xs text-muted-foreground mt-1 text-center">
                                + עוד {tradeCount - 3} עסקאות נוספות
                              </div>
                            )}
                          </div>
                          
                          <div className="text-xs mt-2 text-muted-foreground border-t border-gray-200 dark:border-gray-700 pt-1">
                            לחץ להצגת פרטים מלאים
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">אין עסקאות ביום זה</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">יום מחודש {dayObj.month === 'prev' ? 'קודם' : 'הבא'}</p>
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
