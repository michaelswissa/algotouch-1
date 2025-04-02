
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
  
  // Reset selected day when month changes
  useEffect(() => {
    setSelectedDay(null);
  }, [currentMonth, currentYear]);
  
  // Log for debugging
  useEffect(() => {
    if (tradesData && Object.keys(tradesData).length > 0) {
      console.log("MonthCalendarSection: Trade data received", Object.keys(tradesData).length, "days with trades");
    }
  }, [tradesData]);
  
  const handleDayClick = (day: number) => {
    // CRITICAL: Always use consistent key format - day-current
    const dayKey = `${day}-current`;
    console.log("Day clicked:", dayKey, "Has trades:", tradesData[dayKey]?.length || 0);
    
    // Set the selected day
    setSelectedDay(dayKey);
  };
  
  // Get selected day trades
  const selectedDayTrades = selectedDay && tradesData[selectedDay] ? tradesData[selectedDay] : [];
  
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
