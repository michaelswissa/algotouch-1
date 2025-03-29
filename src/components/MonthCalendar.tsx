
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
import { TradeRecord } from '@/lib/trade-analysis';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import { mockTradeData, mockDaysWithStatus } from '@/components/calendar/mockTradeData';
import { generateCalendarDays } from '@/components/calendar/calendarUtils';

interface MonthCalendarProps {
  month: string;
  year: number;
  status?: 'Open' | 'Active';
  onDayClick?: (day: number) => void;
  onBackToYear?: () => void;
  tradesData?: Record<string, TradeRecord[]>;
}

const MonthCalendar = ({ 
  month, 
  year, 
  status = 'Open', 
  onDayClick,
  onBackToYear,
  tradesData = mockTradeData
}: MonthCalendarProps) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Days of week in Hebrew
  const daysOfWeek = ['יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת', 'יום א׳'];
  
  // Generate calendar days for the month
  const calendarDays = generateCalendarDays(month, year, mockDaysWithStatus);
  
  // Handle day click
  const handleDayClick = (day: number, month: 'current' | 'prev' | 'next') => {
    if (month === 'current') {
      setSelectedDay(`${day}-${month}`);
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
        <CalendarGrid 
          daysOfWeek={daysOfWeek}
          calendarDays={calendarDays}
          onDayClick={handleDayClick}
          selectedDay={selectedDay}
          tradesData={tradesData}
        />
      </div>
    </div>
  );
};

export default MonthCalendar;
