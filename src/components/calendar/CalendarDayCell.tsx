
import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import CalendarDayTooltip from './CalendarDayTooltip';

interface CalendarDayCellProps {
  dayObj: {
    day: number;
    month: 'current' | 'prev' | 'next';
    status?: 'positive' | 'negative' | 'neutral';
    isToday?: boolean;
  };
  index: number;
  isSelected: boolean;
  tradeCount: number;
  dailyPnL: number;
  hasTrades: boolean;
  onDayClick: (day: number, month: 'current' | 'prev' | 'next') => void;
  getTradesPreview: (day: number, month: 'current' | 'prev' | 'next') => React.ReactNode;
}

const CalendarDayCell = ({ 
  dayObj,
  index,
  isSelected,
  tradeCount,
  dailyPnL,
  hasTrades, 
  onDayClick,
  getTradesPreview
}: CalendarDayCellProps) => {
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
          <CalendarDayTooltip 
            dayObj={dayObj}
            hasTrades={hasTrades}
            tradeCount={tradeCount}
            dailyPnL={dailyPnL}
            getTradesPreview={getTradesPreview}
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CalendarDayCell;
