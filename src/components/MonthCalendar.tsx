
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TradeRecord } from '@/lib/trade-analysis';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import { mockTradeData, mockDaysWithStatus } from '@/components/calendar/mockTradeData';
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
  tradesData = mockTradeData
}: MonthCalendarProps) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Days of week in Hebrew
  const daysOfWeek = ['יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת', 'יום א׳'];
  
  // Generate calendar days for the month
  const calendarDays = generateCalendarDays(month, year, mockDaysWithStatus);
  
  // Calculate total trades and profit for the month
  const calculateMonthlyStats = () => {
    let totalTrades = 0;
    let totalProfit = 0;
    
    Object.keys(tradesData).forEach(key => {
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
      setSelectedDay(`${day}-${month}`);
      if (onDayClick) onDayClick(day);
    }
  };
  
  // Mock function for adding trades - would be implemented in a real app
  const handleAddTrade = () => {
    console.log('Add trade clicked');
  };
  
  // Generate random trade data for demonstration
  const generateRandomTradeData = () => {
    const randomTradesData = { ...tradesData };
    
    // Generate between 5-10 random days with trades
    const daysCount = Math.floor(Math.random() * 6) + 5;
    const daysInMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0).getDate();
    
    for (let i = 0; i < daysCount; i++) {
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const dayKey = `${day}-current`;
      
      // 1-3 trades per day
      const tradesCount = Math.floor(Math.random() * 3) + 1;
      const dayTrades = [];
      
      for (let j = 0; j < tradesCount; j++) {
        const isProfit = Math.random() > 0.4; // 60% chance of profit
        const amount = Math.floor(Math.random() * 1000) + 100;
        
        dayTrades.push({
          AccountNumber: "12345",
          Contract: ["NQ", "ES", "MES", "MNQ"][Math.floor(Math.random() * 4)],
          'Signal Name': ["Breakout", "Trend Follow", "Reversal", "Support Bounce"][Math.floor(Math.random() * 4)],
          Side: Math.random() > 0.5 ? 'Long' : 'Short',
          'Entry DateTime': `2023-${month}-${day}T${9 + Math.floor(Math.random() * 7)}:${Math.floor(Math.random() * 60)}:00`,
          'Exit DateTime': `2023-${month}-${day}T${12 + Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 60)}:00`,
          EntryPrice: 15000 + Math.floor(Math.random() * 1000),
          ExitPrice: 15000 + Math.floor(Math.random() * 1000),
          ProfitLoss: isProfit ? amount : -amount,
          Net: isProfit ? amount * 0.95 : -amount * 1.05,
          Equity: 25000 + Math.floor(Math.random() * 5000)
        });
      }
      
      randomTradesData[dayKey] = dayTrades;
    }
    
    return randomTradesData;
  };
  
  // Only use mockTradeData if it's not already generated
  const enhancedTradeData = Object.keys(tradesData).length <= 10 ? generateRandomTradeData() : tradesData;
  
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
          tradesData={enhancedTradeData}
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
