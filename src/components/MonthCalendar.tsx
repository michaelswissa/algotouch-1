
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import CalendarGrid from './calendar/CalendarGrid';

interface MonthCalendarProps {
  month: string;
  year: number;
  status?: 'Open' | 'Active';
  onDayClick?: (day: number) => void;
}

const MonthCalendar = ({ month, year, status = 'Open', onDayClick }: MonthCalendarProps) => {
  // Mock data - in a real app, this would be calculated based on month/year
  const daysWithStatus: Record<number, 'positive' | 'negative' | 'neutral'> = {
    2: 'positive',
    3: 'positive',
    9: 'negative',
    11: 'negative',
    12: 'positive',
    13: 'negative',
    17: 'positive',
    19: 'positive',
    20: 'negative',
    26: 'negative',
    29: 'positive',
    30: 'positive',
    31: 'positive',
  };

  // In a real app, this would be determined dynamically
  const currentDate = new Date();
  const today = currentDate.getDate();
  const isCurrentMonth = 
    currentDate.getMonth() === new Date(`${month} 1, ${year}`).getMonth() && 
    currentDate.getFullYear() === year;

  // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(`${month} 1, ${year}`).getDay();
  
  // Adjust for the week starting with Monday in Hebrew calendar (Sunday is 0, so we adjust to 6 for Sunday)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  // Get the number of days in the month
  const daysInMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0).getDate();
  
  // Get the number of days in the previous month
  const prevMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth(), 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  // Generate an array of days for the calendar grid
  const calendarDays = [];
  
  // Add days from the previous month
  for (let i = adjustedFirstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, month: 'prev' as const });
  }
  
  // Add days from the current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ 
      day: i, 
      month: 'current' as const, 
      status: daysWithStatus[i] || 'neutral',
      isToday: isCurrentMonth && today === i
    });
  }
  
  // Add days from the next month
  const remainingCells = 42 - calendarDays.length; // 6 rows x 7 days = 42 cells
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({ day: i, month: 'next' as const });
  }

  const handleDayClick = (day: number, month: 'current' | 'prev' | 'next') => {
    if (month === 'current' && onDayClick) {
      onDayClick(day);
    }
  };

  const daysOfWeek = ['יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת', 'יום א׳'];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-primary" />
          <h3 className="text-xl font-medium">{month}, {year}</h3>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "px-3 py-1 rounded-full",
            status === 'Active' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : 
                                "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
          )}
        >
          {status}
        </Badge>
      </div>

      <CalendarGrid 
        daysOfWeek={daysOfWeek}
        calendarDays={calendarDays}
        onDayClick={handleDayClick}
      />
    </div>
  );
};

export default MonthCalendar;
