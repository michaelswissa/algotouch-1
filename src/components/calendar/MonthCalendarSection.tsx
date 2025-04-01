
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import MonthCalendar from '@/components/MonthCalendar';
import { TradeRecord } from '@/lib/trade-analysis';
import SelectedDayTrades from '@/components/calendar/SelectedDayTrades';
import { MonthHeader } from '@/components/calendar/MonthHeader';

interface MonthCalendarSectionProps {
  currentMonth: string;
  currentYear: number;
  prevMonth: () => void;
  nextMonth: () => void;
  systemCurrentMonth?: string;
  systemCurrentYear?: number;
  onBackToYear?: () => void;
  tradesData?: Record<string, TradeRecord[]>;
}

export const MonthCalendarSection = ({ 
  currentMonth, 
  currentYear, 
  prevMonth, 
  nextMonth,
  systemCurrentMonth,
  systemCurrentYear,
  onBackToYear,
  tradesData = {}
}: MonthCalendarSectionProps) => {
  const isCurrentMonth = currentMonth === systemCurrentMonth && currentYear === systemCurrentYear;
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Effect to log when tradesData changes
  useEffect(() => {
    console.log("MonthCalendarSection: Received trades data with", 
      Object.keys(tradesData).length, "days");
  }, [tradesData]);
  
  const handleDayClick = (day: number) => {
    const dayKey = `${day}-current`;
    console.log(`Day ${day} clicked, looking for trades with key: ${dayKey}`);
    console.log(`Available trade keys:`, Object.keys(tradesData || {}));
    setSelectedDay(dayKey);
  };
  
  // Get selected day trades
  const selectedDayTrades = selectedDay && tradesData?.[selectedDay] ? tradesData[selectedDay] : [];
  console.log("Selected day trades:", selectedDayTrades.length);
  
  return (
    <div className="col-span-2">
      <MonthHeader prevMonth={prevMonth} nextMonth={nextMonth} />
      
      <MonthCalendar 
        month={currentMonth} 
        year={currentYear} 
        status={isCurrentMonth ? "Active" : "Open"} 
        onBackToYear={onBackToYear}
        tradesData={tradesData}
        onDayClick={handleDayClick}
      />
      
      {/* Display selected day trades */}
      <SelectedDayTrades 
        selectedDay={selectedDay} 
        selectedDayTrades={selectedDayTrades} 
        month={currentMonth} 
      />
    </div>
  );
};
