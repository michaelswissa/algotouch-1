
import React, { useState } from 'react';
import CalendarGrid from './calendar/CalendarGrid';
import MonthCalendarHeader from './calendar/MonthCalendarHeader';
import SelectedDayTrades from './calendar/SelectedDayTrades';
import { mockTradeData, mockDaysWithStatus } from './calendar/mockTradeData';
import { generateCalendarDays } from './calendar/calendarUtils';
import { TradeRecord } from '@/lib/trade-analysis';

interface MonthCalendarProps {
  month: string;
  year: number;
  status?: 'Open' | 'Active';
  onDayClick?: (day: number) => void;
}

const MonthCalendar = ({ month, year, status = 'Open', onDayClick }: MonthCalendarProps) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Generate calendar days using the utility function
  const calendarDays = generateCalendarDays(month, year, mockDaysWithStatus);

  const handleDayClick = (day: number, month: 'current' | 'prev' | 'next') => {
    const dayKey = `${day}-${month}`;
    if (month === 'current' && onDayClick) {
      onDayClick(day);
    }
    
    // Toggle selected day
    if (selectedDay === dayKey) {
      setSelectedDay(null);
    } else {
      setSelectedDay(dayKey);
    }
  };

  const daysOfWeek = ['יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת', 'יום א׳'];

  // Get trades for the selected day
  const selectedDayTrades = selectedDay ? mockTradeData[selectedDay] || [] : [];
  
  // Count total trades in this month
  const totalTrades = Object.keys(mockTradeData).reduce((count, key) => {
    if (key.includes('-current')) {
      return count + mockTradeData[key].length;
    }
    return count;
  }, 0);

  return (
    <div className="w-full">
      <MonthCalendarHeader 
        month={month} 
        year={year} 
        status={status} 
        tradesCount={totalTrades}
      />

      <CalendarGrid 
        daysOfWeek={daysOfWeek}
        calendarDays={calendarDays}
        onDayClick={handleDayClick}
        selectedDay={selectedDay}
        tradesData={mockTradeData}
      />

      {selectedDay && (
        <SelectedDayTrades 
          selectedDay={selectedDay} 
          selectedDayTrades={selectedDayTrades} 
          month={month} 
        />
      )}
    </div>
  );
};

export default MonthCalendar;
