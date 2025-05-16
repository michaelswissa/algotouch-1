
import React from 'react';
import { cn } from '@/lib/utils';

interface CalendarDayProps {
  day: number;
  isToday?: boolean;
  status?: 'positive' | 'negative' | 'neutral';
  month: 'current' | 'prev' | 'next';
  onClick?: () => void;
  tradeCount?: number;
  isSelected?: boolean;
}

const CalendarDay = ({ 
  day, 
  isToday = false, 
  status = 'neutral', 
  month = 'current', 
  onClick,
  tradeCount = 0,
  isSelected = false
}: CalendarDayProps) => {
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
        'h-9 w-9 flex items-center justify-center rounded-full text-sm m-auto relative',
        month !== 'current' && 'text-gray-400/50',
        getStatusClass(),
        isToday && 'ring-2 ring-primary',
        isSelected && 'bg-primary/20 font-bold',
        month === 'current' && 'hover:bg-primary/10 cursor-pointer transition-colors',
      )}
    >
      {day}
      
      {tradeCount > 0 && (
        <span className={cn(
          "absolute -top-1 -right-1 text-xs rounded-full w-4 h-4 flex items-center justify-center",
          status === 'positive' ? 'bg-green-500 text-white' : 
          status === 'negative' ? 'bg-red-500 text-white' : 
          'bg-primary text-white'
        )}>
          {tradeCount}
        </span>
      )}
    </div>
  );
};

export default CalendarDay;
