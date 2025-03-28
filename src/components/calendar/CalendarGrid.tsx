
import React from 'react';
import CalendarDay from './CalendarDay';
import CalendarDaysHeader from './CalendarDaysHeader';

interface CalendarDayInfo {
  day: number;
  month: 'current' | 'prev' | 'next';
  status?: 'positive' | 'negative' | 'neutral';
  isToday?: boolean;
}

interface CalendarGridProps {
  daysOfWeek: string[];
  calendarDays: CalendarDayInfo[];
  onDayClick: (day: number, month: 'current' | 'prev' | 'next') => void;
}

const CalendarGrid = ({ daysOfWeek, calendarDays, onDayClick }: CalendarGridProps) => {
  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      <CalendarDaysHeader daysOfWeek={daysOfWeek} />
      
      {calendarDays.map((day, index) => (
        <CalendarDay
          key={index}
          day={day.day}
          status={day.status}
          month={day.month}
          isToday={day.isToday}
          onClick={() => onDayClick(day.day, day.month)}
        />
      ))}
    </div>
  );
};

export default CalendarGrid;
