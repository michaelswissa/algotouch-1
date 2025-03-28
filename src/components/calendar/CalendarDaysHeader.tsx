
import React from 'react';

interface CalendarDaysHeaderProps {
  daysOfWeek: string[];
}

const CalendarDaysHeader = ({ daysOfWeek }: CalendarDaysHeaderProps) => {
  return (
    <>
      {daysOfWeek.map((day, index) => (
        <div key={index} className="text-xs text-muted-foreground py-2 font-medium">
          {day}
        </div>
      ))}
    </>
  );
};

export default CalendarDaysHeader;
