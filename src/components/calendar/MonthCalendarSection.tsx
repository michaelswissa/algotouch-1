
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import MonthCalendar from '@/components/MonthCalendar';
import { TradeRecord } from '@/lib/trade-analysis';
import SelectedDayTradesDetailed from '@/components/calendar/SelectedDayTradesDetailed';
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
  
  // Hebrew month names for getting the month index
  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  
  // Get month index
  const monthIndex = hebrewMonths.indexOf(currentMonth);
  
  // Reset selected day when month changes
  useEffect(() => {
    setSelectedDay(null);
  }, [currentMonth, currentYear]);
  
  // Log for debugging
  useEffect(() => {
    console.log(`MonthCalendarSection: Rendering ${currentMonth} ${currentYear}, monthIndex=${monthIndex}`);
    console.log(`MonthCalendarSection: Total trade days in store: ${Object.keys(tradesData).length}`);
    
    // Filter trades only for this month and year
    const filteredDays = Object.keys(tradesData).filter(key => {
      const parts = key.split('-');
      return parts.length === 3 && 
             parseInt(parts[1]) === monthIndex && 
             parseInt(parts[2]) === currentYear;
    });
    
    console.log(`MonthCalendarSection: Filtered trade days for this month: ${filteredDays.length}`);
    
    if (filteredDays.length > 0) {
      console.log("Sample days with trades:", filteredDays.slice(0, 3));
      
      // Log details about the first few days
      filteredDays.slice(0, 3).forEach(day => {
        const trades = tradesData[day];
        console.log(`Day ${day} has ${trades.length} trades with profit: $${
          trades.reduce((sum, trade) => sum + (trade.Net || 0), 0).toFixed(2)
        }`);
      });
    } else {
      console.log(`No trades found for ${currentMonth} ${currentYear}`);
    }
  }, [tradesData, currentMonth, currentYear, monthIndex]);
  
  const handleDayClick = (day: number) => {
    // New format: Create a key with day-month-year
    const dayKey = `${day}-${monthIndex}-${currentYear}`;
    console.log("Day clicked:", dayKey, "Has trades:", tradesData[dayKey]?.length || 0);
    
    // If clicking the same day, toggle selection
    if (selectedDay === dayKey) {
      setSelectedDay(null);
    } else {
      // Set the selected day
      setSelectedDay(dayKey);
    }
  };
  
  // Get selected day trades
  const selectedDayTrades = selectedDay && tradesData[selectedDay] ? tradesData[selectedDay] : [];
  
  return (
    <div className="col-span-2">
      <MonthHeader 
        currentMonth={currentMonth}
        currentYear={currentYear} 
        prevMonth={prevMonth} 
        nextMonth={nextMonth} 
        onBackToYear={onBackToYear}
      />
      
      <MonthCalendar 
        month={currentMonth} 
        year={currentYear} 
        status={isCurrentMonth ? "Active" : "Open"} 
        onBackToYear={onBackToYear}
        tradesData={tradesData}
        onDayClick={handleDayClick}
        selectedDay={selectedDay}
      />
      
      {/* Display selected day trades with our new detailed component */}
      <SelectedDayTradesDetailed 
        selectedDay={selectedDay} 
        trades={selectedDayTrades} 
        month={currentMonth}
      />
    </div>
  );
};
