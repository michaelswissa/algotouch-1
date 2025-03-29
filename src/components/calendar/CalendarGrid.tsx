
import React from 'react';
import { cn } from '@/lib/utils';
import { TradeRecord } from '@/lib/trade-analysis';

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
          
          return (
            <div
              key={index}
              onClick={() => onDayClick(dayObj.day, dayObj.month)}
              className={cn(
                "py-2 relative rounded-md cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[60px]",
                dayObj.month === 'current'
                  ? "font-medium hover:bg-secondary/50"
                  : "text-muted-foreground opacity-40 hover:opacity-60",
                dayObj.isToday && "border-2 border-primary",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                !isSelected && dayObj.status === 'positive' && "bg-green-50 dark:bg-green-950/20",
                !isSelected && dayObj.status === 'negative' && "bg-red-50 dark:bg-red-950/20",
                dayObj.month === 'current' && !dayObj.status && "bg-slate-50 dark:bg-slate-950/10"
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
                <div className={cn(
                  "text-xs mt-1 px-1.5 py-0.5 rounded-full",
                  isSelected 
                    ? "bg-white/20 text-white" 
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                )}>
                  {tradeCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
