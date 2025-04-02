
import React from 'react';
import { cn } from '@/lib/utils';

interface CalendarDayProps {
  day: number;
  isToday?: boolean;
  status?: 'positive' | 'negative' | 'neutral';
  month: 'current' | 'prev' | 'next';
  onClick?: () => void;
}

const CalendarDay = ({ day, isToday = false, status = 'neutral', month = 'current', onClick }: CalendarDayProps) => {
  const getStatusClass = () => {
    if (month !== 'current') return 'text-gray-300';
    if (status === 'positive') return 'bg-green-50 text-green-700 font-medium';
    if (status === 'negative') return 'bg-red-50 text-red-700 font-medium';
    return '';
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        'h-9 w-9 flex items-center justify-center rounded-full text-sm m-auto',
        month !== 'current' && 'text-gray-400/50',
        getStatusClass(),
        isToday && 'ring-2 ring-primary',
        month === 'current' && 'hover:bg-primary/10 cursor-pointer transition-colors',
      )}
    >
      {day}
    </div>
  );
};

export default CalendarDay;
