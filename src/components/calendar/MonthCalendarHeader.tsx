
import React from 'react';
import { ArrowUp, ArrowDown, CalendarDays, CirclePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MonthCalendarHeaderProps {
  month: string;
  year: number;
  status?: 'Open' | 'Active';
  tradesCount: number;
  totalProfit: number;
  onAddTrade: () => void;
}

const MonthCalendarHeader = ({ 
  month, 
  year, 
  status, 
  tradesCount, 
  totalProfit,
  onAddTrade
}: MonthCalendarHeaderProps) => {
  return (
    <div className="px-5 py-3 border-b bg-muted/20" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-primary" />
          <h3 className="text-xl font-bold">
            {month} {year}
          </h3>
          {status === 'Active' && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50">
              חודש נוכחי
            </span>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
          onClick={onAddTrade}
        >
          <CirclePlus size={16} />
          <span>הוסף עסקה</span>
        </Button>
      </div>
      
      <div className="flex items-center gap-6 mt-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">סך הכל עסקאות:</span>
          <span className="px-2 py-0.5 bg-blue-50 rounded-full border border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-300">
            {tradesCount}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-medium">סך הכל בחודש:</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full border flex items-center gap-1",
            totalProfit > 0 
              ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-300" 
              : "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-300"
          )}>
            {totalProfit > 0 ? (
              <>
                <ArrowUp size={14} />
                <span>${totalProfit.toFixed(2)}</span>
              </>
            ) : (
              <>
                <ArrowDown size={14} />
                <span>${Math.abs(totalProfit).toFixed(2)}</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonthCalendarHeader;
