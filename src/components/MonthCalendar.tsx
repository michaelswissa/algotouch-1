
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
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
}

const MonthCalendar = ({ 
  month, 
  year, 
  status = 'Open', 
  onDayClick,
  onBackToYear,
  tradesData = {}
}: MonthCalendarProps) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Log received data for debugging
  useEffect(() => {
    console.log("MonthCalendar received tradesData:", Object.keys(tradesData).length, "days");
    if (Object.keys(tradesData).length > 0) {
      console.log("Sample data key:", Object.keys(tradesData)[0]);
      const sampleKey = Object.keys(tradesData)[0];
      console.log("Sample trades count:", tradesData[sampleKey]?.length || 0);
    }
  }, [tradesData]);
  
  // Days of week in Hebrew
  const daysOfWeek = ['יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת', 'יום א׳'];
  
  // Generate calendar days for the month - pass empty object for now, we'll handle status in CalendarGrid
  const calendarDays = generateCalendarDays(month, year, {});
  
  // Calculate total trades and profit for the month using real data
  const calculateMonthlyStats = () => {
    let totalTrades = 0;
    let totalProfit = 0;
    
    Object.keys(tradesData).forEach(key => {
      // Only count days with the 'current' format (real data)
      if (key.includes('-current')) {
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
  
  // Handle day click
  const handleDayClick = (day: number, month: 'current' | 'prev' | 'next') => {
    if (month === 'current') {
      const dayKey = `${day}-${month}`;
      console.log(`Day ${day} clicked, setting selected day to: ${dayKey}`);
      console.log(`Available trade keys:`, Object.keys(tradesData || {}));
      setSelectedDay(dayKey);
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
          selectedDay={selectedDay}
          tradesData={tradesData}
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
