
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TradeRecord } from '@/lib/trade-analysis';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import { generateCalendarDays } from '@/components/calendar/calendarUtils';
import MonthCalendarHeader from '@/components/calendar/MonthCalendarHeader';

interface MonthCalendarProps {
  month: string;
  year: number;
  status?: 'Open' | 'Active';
  onDayClick?: (day: number) => void;
  onBackToYear?: () => void;
  tradesData?: Record<string, TradeRecord[]>;
  selectedDay?: string | null;
}

const MonthCalendar = ({ 
  month, 
  year, 
  status = 'Open', 
  onDayClick,
  onBackToYear,
  tradesData = {},
  selectedDay = null
}: MonthCalendarProps) => {
  const [internalSelectedDay, setInternalSelectedDay] = useState<string | null>(selectedDay);
  
  // Update internal state when prop changes
  useEffect(() => {
    setInternalSelectedDay(selectedDay);
  }, [selectedDay]);
  
  // Reset selected day when month changes
  useEffect(() => {
    if (!selectedDay) {
      setInternalSelectedDay(null);
    }
  }, [month, year, selectedDay]);
  
  // Hebrew month names
  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  
  // Get month index (0-11)
  const monthIndex = hebrewMonths.indexOf(month);
  
  // Days of week in Hebrew
  const daysOfWeek = ['יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת', 'יום א׳'];
  
  // Generate calendar days for the month using real data
  const calendarDays = generateCalendarDays(month, year, tradesData);
  
  // Calculate total trades and profit for the month using real data
  const calculateMonthlyStats = () => {
    let totalTrades = 0;
    let totalProfit = 0;
    
    // Filter trades only for the current month and year
    Object.keys(tradesData).forEach(key => {
      // New format: day-month-year
      const parts = key.split('-');
      const keyMonth = parseInt(parts[1]);
      const keyYear = parseInt(parts[2]);
      
      // Check if this trade belongs to the current month and year
      if (keyMonth === monthIndex && keyYear === year) {
        const trades = tradesData[key];
        totalTrades += trades.length;
        trades.forEach(trade => {
          totalProfit += trade.Net || 0;
        });
      }
    });
    
    return { totalTrades, totalProfit };
  };
  
  const { totalTrades, totalProfit } = calculateMonthlyStats();
  
  console.log(`MonthCalendar: For ${month} ${year} - monthIndex=${monthIndex}, found ${totalTrades} trades with profit ${totalProfit}`);
  
  // Handle day click
  const handleDayClick = (day: number, month: 'current' | 'prev' | 'next') => {
    if (month === 'current') {
      // Create key in the new format
      const dayKey = `${day}-${monthIndex}-${year}`;
      console.log("Day clicked:", dayKey, "Has trades:", tradesData[dayKey]?.length || 0);
      
      setInternalSelectedDay(dayKey);
      if (onDayClick) onDayClick(day);
    }
  };
  
  return (
    <div className="w-full border rounded-xl shadow-sm bg-card overflow-hidden">
      <MonthCalendarHeader 
        month={month}
        year={year}
        status={status}
        tradesCount={totalTrades}
        totalProfit={totalProfit}
        onAddTrade={() => console.log('Add trade clicked')}
      />
      
      <div className="p-4">
        <CalendarGrid 
          daysOfWeek={daysOfWeek}
          calendarDays={calendarDays}
          onDayClick={handleDayClick}
          selectedDay={internalSelectedDay}
          tradesData={tradesData}
          currentMonthIndex={monthIndex}
          currentYear={year}
        />
      </div>
      
      {onBackToYear && (
        <div className="px-4 pb-4 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-1 text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
            onClick={onBackToYear}
          >
            <span>חזרה לתצוגת שנה</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default MonthCalendar;

