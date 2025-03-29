
import React, { useState } from 'react';
import CalendarGrid from './calendar/CalendarGrid';
import MonthCalendarHeader from './calendar/MonthCalendarHeader';
import SelectedDayTrades from './calendar/SelectedDayTrades';
import { mockTradeData, mockDaysWithStatus } from './calendar/mockTradeData';
import { generateCalendarDays } from './calendar/calendarUtils';
import { TradeRecord } from '@/lib/trade-analysis';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MonthCalendarProps {
  month: string;
  year: number;
  status?: 'Open' | 'Active';
  onDayClick?: (day: number) => void;
}

const MonthCalendar = ({ month, year, status = 'Open', onDayClick }: MonthCalendarProps) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const { toast } = useToast();
  
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

  const handleAddTrade = () => {
    toast({
      title: "הוספת עסקה חדשה",
      description: "פונקציונליות להוספת עסקה תתווסף בעתיד.",
      duration: 3000,
    });
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
  
  // Calculate total profit in this month
  const totalProfit = Object.entries(mockTradeData).reduce((total, [key, trades]) => {
    if (key.includes('-current')) {
      return total + trades.reduce((sum, trade) => sum + (trade.Net || 0), 0);
    }
    return total;
  }, 0);

  return (
    <div className="w-full border rounded-xl shadow-sm bg-card overflow-hidden">
      <MonthCalendarHeader 
        month={month} 
        year={year} 
        status={status} 
        tradesCount={totalTrades}
        totalProfit={totalProfit}
        onAddTrade={handleAddTrade}
      />

      <div className="p-4">
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
    </div>
  );
};

export default MonthCalendar;
