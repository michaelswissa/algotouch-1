
import React from 'react';
import { cn } from '@/lib/utils';

interface CalendarDayProps {
  day: number;
  isToday?: boolean;
  status?: 'positive' | 'negative' | 'neutral';
  month: 'current' | 'prev' | 'next';
}

const CalendarDay = ({ day, isToday = false, status = 'neutral', month = 'current' }: CalendarDayProps) => {
  const getStatusClass = () => {
    if (month !== 'current') return 'text-gray-300';
    if (status === 'positive') return 'positive';
    if (status === 'negative') return 'negative';
    return '';
  };

  return (
    <div className={cn(
      'calendar-day',
      getStatusClass(),
      isToday && 'border-2 border-blue-400',
    )}>
      {day}
    </div>
  );
};

interface MonthCalendarProps {
  month: string;
  year: number;
  status?: 'פתוח' | 'פעיל' | 'Open' | 'Active';
}

const MonthCalendar = ({ month, year, status = 'Open' }: MonthCalendarProps) => {
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

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">{month}, {year}</h3>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded",
          status === 'פעיל' || status === 'Active' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        )}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        <div className="text-xs text-gray-500">יום ב'</div>
        <div className="text-xs text-gray-500">יום ג'</div>
        <div className="text-xs text-gray-500">יום ד'</div>
        <div className="text-xs text-gray-500">יום ה'</div>
        <div className="text-xs text-gray-500">יום ו'</div>
        <div className="text-xs text-gray-500">שבת</div>
        <div className="text-xs text-gray-500">יום א'</div>

        {/* This would be dynamically generated based on the month */}
        <CalendarDay day={1} status={daysWithStatus[1] || 'neutral'} month="current" isToday={isCurrentMonth && today === 1} />
        <CalendarDay day={2} status={daysWithStatus[2] || 'neutral'} month="current" isToday={isCurrentMonth && today === 2} />
        <CalendarDay day={3} status={daysWithStatus[3] || 'neutral'} month="current" isToday={isCurrentMonth && today === 3} />
        <CalendarDay day={4} status={daysWithStatus[4] || 'neutral'} month="current" isToday={isCurrentMonth && today === 4} />
        <CalendarDay day={5} status={daysWithStatus[5] || 'neutral'} month="current" isToday={isCurrentMonth && today === 5} />
        <CalendarDay day={6} status={daysWithStatus[6] || 'neutral'} month="current" isToday={isCurrentMonth && today === 6} />
        <CalendarDay day={7} status={daysWithStatus[7] || 'neutral'} month="current" isToday={isCurrentMonth && today === 7} />
        
        <CalendarDay day={8} status={daysWithStatus[8] || 'neutral'} month="current" isToday={isCurrentMonth && today === 8} />
        <CalendarDay day={9} status={daysWithStatus[9] || 'neutral'} month="current" isToday={isCurrentMonth && today === 9} />
        <CalendarDay day={10} status={daysWithStatus[10] || 'neutral'} month="current" isToday={isCurrentMonth && today === 10} />
        <CalendarDay day={11} status={daysWithStatus[11] || 'neutral'} month="current" isToday={isCurrentMonth && today === 11} />
        <CalendarDay day={12} status={daysWithStatus[12] || 'neutral'} month="current" isToday={isCurrentMonth && today === 12} />
        <CalendarDay day={13} status={daysWithStatus[13] || 'neutral'} month="current" isToday={isCurrentMonth && today === 13} />
        <CalendarDay day={14} status={daysWithStatus[14] || 'neutral'} month="current" isToday={isCurrentMonth && today === 14} />
        
        <CalendarDay day={15} status={daysWithStatus[15] || 'neutral'} month="current" isToday={isCurrentMonth && today === 15} />
        <CalendarDay day={16} status={daysWithStatus[16] || 'neutral'} month="current" isToday={isCurrentMonth && today === 16} />
        <CalendarDay day={17} status={daysWithStatus[17] || 'neutral'} month="current" isToday={isCurrentMonth && today === 17} />
        <CalendarDay day={18} status={daysWithStatus[18] || 'neutral'} month="current" isToday={isCurrentMonth && today === 18} />
        <CalendarDay day={19} status={daysWithStatus[19] || 'neutral'} month="current" isToday={isCurrentMonth && today === 19} />
        <CalendarDay day={20} status={daysWithStatus[20] || 'neutral'} month="current" isToday={isCurrentMonth && today === 20} />
        <CalendarDay day={21} status={daysWithStatus[21] || 'neutral'} month="current" isToday={isCurrentMonth && today === 21} />
        
        <CalendarDay day={22} status={daysWithStatus[22] || 'neutral'} month="current" isToday={isCurrentMonth && today === 22} />
        <CalendarDay day={23} status={daysWithStatus[23] || 'neutral'} month="current" isToday={isCurrentMonth && today === 23} />
        <CalendarDay day={24} status={daysWithStatus[24] || 'neutral'} month="current" isToday={isCurrentMonth && today === 24} />
        <CalendarDay day={25} status={daysWithStatus[25] || 'neutral'} month="current" isToday={isCurrentMonth && today === 25} />
        <CalendarDay day={26} status={daysWithStatus[26] || 'neutral'} month="current" isToday={isCurrentMonth && today === 26} />
        <CalendarDay day={27} status={daysWithStatus[27] || 'neutral'} month="current" isToday={isCurrentMonth && today === 27} />
        <CalendarDay day={28} status={daysWithStatus[28] || 'neutral'} month="current" isToday={isCurrentMonth && today === 28} />
        
        <CalendarDay day={29} status={daysWithStatus[29] || 'neutral'} month="current" isToday={isCurrentMonth && today === 29} />
        <CalendarDay day={30} status={daysWithStatus[30] || 'neutral'} month="current" isToday={isCurrentMonth && today === 30} />
        <CalendarDay day={31} status={daysWithStatus[31] || 'neutral'} month="current" isToday={isCurrentMonth && today === 31} />
        {/* Fill in the rest of the grid with days from next month */}
        <CalendarDay day={1} month="next" />
        <CalendarDay day={2} month="next" />
        <CalendarDay day={3} month="next" />
        <CalendarDay day={4} month="next" />
      </div>
    </div>
  );
};

export default MonthCalendar;
