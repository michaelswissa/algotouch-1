
import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import { TradeRecord } from '@/lib/trade-analysis';

interface CalendarDayTooltipProps {
  dayObj: {
    day: number;
    month: 'current' | 'prev' | 'next';
  };
  hasTrades: boolean;
  tradeCount: number;
  dailyPnL: number;
  getTradesPreview: (day: number, month: 'current' | 'prev' | 'next') => React.ReactNode;
}

const CalendarDayTooltip = ({ 
  dayObj, 
  hasTrades, 
  tradeCount, 
  dailyPnL,
  getTradesPreview 
}: CalendarDayTooltipProps) => {
  if (dayObj.month !== 'current') {
    return (
      <p className="text-sm">יום מחודש {dayObj.month === 'prev' ? 'קודם' : 'הבא'}</p>
    );
  }

  return (
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
            {getTradesPreview(dayObj.day, dayObj.month)}
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
  );
};

export default CalendarDayTooltip;
