
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Mock data for trades
const mockTradeData = {
  '2-current': [
    { Contract: "NQ", Side: 'Long', EntryPrice: 15680, ExitPrice: 15720, Net: 385 },
    { Contract: "ES", Side: 'Long', EntryPrice: 4850, ExitPrice: 4865, Net: 720 }
  ],
  '5-current': [
    { Contract: "NQ", Side: 'Long', EntryPrice: 15710, ExitPrice: 15760, Net: 480 }
  ],
  '9-current': [
    { Contract: "NQ", Side: 'Short', EntryPrice: 15820, ExitPrice: 15750, Net: -730 }
  ],
  '12-current': [
    { Contract: "ES", Side: 'Long', EntryPrice: 4820, ExitPrice: 4840, Net: 970 },
    { Contract: "NQ", Side: 'Long', EntryPrice: 15600, ExitPrice: 15640, Net: 385 }
  ],
  '15-current': [
    { Contract: "ES", Side: 'Long', EntryPrice: 4830, ExitPrice: 4860, Net: 1450 }
  ],
  '19-current': [
    { Contract: "NQ", Side: 'Long', EntryPrice: 15750, ExitPrice: 15810, Net: 580 }
  ],
  '22-current': [
    { Contract: "ES", Side: 'Short', EntryPrice: 4875, ExitPrice: 4840, Net: -1780 }
  ],
  '27-current': [
    { Contract: "NQ", Side: 'Long', EntryPrice: 15800, ExitPrice: 15850, Net: 480 }
  ]
};

// Mock data for days with trading status
const mockDaysWithStatus = {
  2: 'positive',
  5: 'positive',
  9: 'negative',
  12: 'positive',
  15: 'positive',
  19: 'positive',
  22: 'negative',
  27: 'positive'
};

interface MonthCalendarProps {
  month: string;
  year: number;
  status?: 'Open' | 'Active';
  onDayClick?: (day: number) => void;
  onBackToYear?: () => void;
}

const MonthCalendar = ({ 
  month, 
  year, 
  status = 'Open', 
  onDayClick,
  onBackToYear
}: MonthCalendarProps) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // Function to get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = () => {
    const firstDay = new Date(`${month} 1, ${year}`).getDay();
    // Convert to Israeli week (Sunday is last day)
    return firstDay === 0 ? 6 : firstDay - 1;
  };
  
  // Function to get number of days in the month
  const getDaysInMonth = () => {
    return new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0).getDate();
  };
  
  // Generate the calendar grid
  const generateCalendarDays = () => {
    const firstDay = getFirstDayOfMonth();
    const daysInMonth = getDaysInMonth();
    
    // Get the number of days in the previous month
    const prevMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth(), 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    const days = [];
    
    // Add days from the previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ 
        day: daysInPrevMonth - i, 
        month: 'prev', 
        status: 'neutral'
      });
    }
    
    // Add days from the current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ 
        day: i, 
        month: 'current', 
        status: mockDaysWithStatus[i] || 'neutral',
        isToday: new Date().getDate() === i && 
                 new Date().getMonth() === new Date(`${month} 1, ${year}`).getMonth() &&
                 new Date().getFullYear() === year
      });
    }
    
    // Add days from the next month
    const remainingCells = 42 - days.length; // 6 rows x 7 days
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ 
        day: i, 
        month: 'next', 
        status: 'neutral'
      });
    }
    
    return days;
  };
  
  const calendarDays = generateCalendarDays();
  const daysOfWeek = ['יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת', 'יום א׳'];
  
  // Get trades for a specific day
  const getTradesForDay = (day: number) => {
    const dayKey = `${day}-current`;
    return mockTradeData[dayKey] || [];
  };
  
  // Calculate daily profit/loss
  const getDailyPnL = (day: number) => {
    const trades = getTradesForDay(day);
    return trades.reduce((total, trade) => total + trade.Net, 0);
  };
  
  // Handle day click
  const handleDayClick = (day: number, month: string) => {
    if (month === 'current') {
      setSelectedDay(day);
      if (onDayClick) onDayClick(day);
    }
  };
  
  return (
    <div className="w-full border rounded-xl shadow-sm bg-card overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/20" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-primary" />
            <h3 className="text-xl font-bold">
              {month} {year}
            </h3>
            {status === 'Active' && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50">
                חודש נוכחי
              </span>
            )}
          </div>
          
          {onBackToYear && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1 text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
              onClick={onBackToYear}
            >
              <span>חזרה לתצוגת שנה</span>
            </Button>
          )}
        </div>
      </div>
      
      <div className="p-4">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-1 text-center" dir="rtl">
          {daysOfWeek.map((day, index) => (
            <div key={index} className="py-2 text-sm font-medium text-secondary-foreground bg-secondary/30 rounded-sm">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2 text-center" dir="rtl">
          {calendarDays.map((dayObj, index) => {
            const trades = dayObj.month === 'current' ? getTradesForDay(dayObj.day) : [];
            const hasTrades = trades.length > 0;
            const dailyPnL = dayObj.month === 'current' ? getDailyPnL(dayObj.day) : 0;
            
            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={cn(
                        "relative rounded-md cursor-pointer transition-all h-[70px] flex flex-col items-center justify-start border shadow-sm",
                        dayObj.month === 'current' ? "hover:shadow-md hover:border-primary/50" : "opacity-40",
                        dayObj.isToday && "ring-2 ring-primary",
                        dayObj.month === 'current' && hasTrades && dailyPnL > 0 && "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/40",
                        dayObj.month === 'current' && hasTrades && dailyPnL < 0 && "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/40",
                        dayObj.month === 'current' && !hasTrades && "bg-card",
                        dayObj.month !== 'current' && "bg-muted/30"
                      )}
                      onClick={() => handleDayClick(dayObj.day, dayObj.month)}
                    >
                      <span className={cn(
                        "text-md mt-2 font-medium",
                        dayObj.status === 'positive' ? "text-green-600 dark:text-green-400" : 
                        dayObj.status === 'negative' ? "text-red-600 dark:text-red-400" : ""
                      )}>
                        {dayObj.day}
                      </span>
                      
                      {hasTrades && (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/40">
                            {trades.length}
                          </span>
                          
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
                              <span>{Math.abs(dailyPnL).toFixed(0)}₪</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="p-2 max-w-xs">
                    {dayObj.month === 'current' ? (
                      <div>
                        <div className="font-bold border-b border-gray-200 dark:border-gray-700 pb-1 mb-1">
                          <span>יום {dayObj.day}</span>
                        </div>
                        
                        {hasTrades ? (
                          <>
                            <div className="text-sm py-1 border-b border-gray-200 dark:border-gray-700">
                              <span className="font-medium">{trades.length} עסקאות</span>
                              <span className={cn(
                                "mx-2 px-1.5 py-0.5 rounded text-xs",
                                dailyPnL > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : 
                                dailyPnL < 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : ""
                              )}>
                                {dailyPnL > 0 ? `רווח: ${dailyPnL.toFixed(2)}₪` : 
                                 dailyPnL < 0 ? `הפסד: ${Math.abs(dailyPnL).toFixed(2)}₪` : 
                                 'אין רווח/הפסד'}
                              </span>
                            </div>
                            
                            <div className="mt-1">
                              {trades.slice(0, 3).map((trade, idx) => (
                                <div key={idx} className="text-xs border-b border-gray-200 dark:border-gray-700 py-1 last:border-0">
                                  <div className="flex justify-between">
                                    <span>{trade.Contract}</span>
                                    <span className={trade.Net > 0 ? "text-green-600" : "text-red-600"}>
                                      {trade.Net.toFixed(2)}₪
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {trades.length > 3 && (
                                <div className="text-xs text-muted-foreground mt-1 text-center">
                                  + עוד {trades.length - 3} עסקאות נוספות
                                </div>
                              )}
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
    </div>
  );
};

export default MonthCalendar;
