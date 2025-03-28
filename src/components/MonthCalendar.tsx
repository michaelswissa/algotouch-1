
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import CalendarGrid from './calendar/CalendarGrid';
import TradeDataTable from './TradeDataTable';
import { Card, CardContent } from './ui/card';
import { TradeRecord } from '@/lib/trade-analysis';

interface MonthCalendarProps {
  month: string;
  year: number;
  status?: 'Open' | 'Active';
  onDayClick?: (day: number) => void;
}

// Sample mock data for trades on specific days
const mockTradeData: Record<string, TradeRecord[]> = {
  '2-current': [
    {
      AccountNumber: "12345",
      Contract: "NQ",
      'Signal Name': "Breakout",
      Side: 'Long',
      'Entry DateTime': "2023-03-02T09:30:00",
      'Exit DateTime': "2023-03-02T11:45:00",
      EntryPrice: 15680,
      ExitPrice: 15720,
      ProfitLoss: 400,
      Net: 385,
      Equity: 25000
    },
    {
      AccountNumber: "12345",
      Contract: "ES",
      'Signal Name': "Trend Follow",
      Side: 'Long',
      'Entry DateTime': "2023-03-02T13:15:00",
      'Exit DateTime': "2023-03-02T14:30:00",
      EntryPrice: 4850,
      ExitPrice: 4865,
      ProfitLoss: 750,
      Net: 720,
      Equity: 25720
    }
  ],
  '9-current': [
    {
      AccountNumber: "12345",
      Contract: "NQ",
      'Signal Name': "Reversal",
      Side: 'Short',
      'Entry DateTime': "2023-03-09T10:15:00",
      'Exit DateTime': "2023-03-09T11:30:00",
      EntryPrice: 15820,
      ExitPrice: 15750,
      ProfitLoss: -700,
      Net: -730,
      Equity: 24990
    }
  ],
  '17-current': [
    {
      AccountNumber: "12345",
      Contract: "ES",
      'Signal Name': "Support Bounce",
      Side: 'Long',
      'Entry DateTime': "2023-03-17T09:45:00",
      'Exit DateTime': "2023-03-17T13:20:00",
      EntryPrice: 4830,
      ExitPrice: 4860,
      ProfitLoss: 1500,
      Net: 1450,
      Equity: 26440
    }
  ]
};

const MonthCalendar = ({ month, year, status = 'Open', onDayClick }: MonthCalendarProps) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Mock data - in a real app, this would be calculated based on month/year
  const daysWithStatus: Record<number, 'positive' | 'negative' | 'neutral'> = {
    2: 'positive',
    3: 'positive',
    9: 'negative',
    11: 'negative',
    12: 'positive',
    13: 'negative',
    17: 'positive',
    19: 'positive',
    20: 'negative',
    26: 'negative',
    29: 'positive',
    30: 'positive',
    31: 'positive',
  };

  // In a real app, this would be determined dynamically
  const currentDate = new Date();
  const today = currentDate.getDate();
  const isCurrentMonth = 
    currentDate.getMonth() === new Date(`${month} 1, ${year}`).getMonth() && 
    currentDate.getFullYear() === year;

  // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(`${month} 1, ${year}`).getDay();
  
  // Adjust for the week starting with Monday in Hebrew calendar (Sunday is 0, so we adjust to 6 for Sunday)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  // Get the number of days in the month
  const daysInMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0).getDate();
  
  // Get the number of days in the previous month
  const prevMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth(), 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  // Generate an array of days for the calendar grid
  const calendarDays = [];
  
  // Add days from the previous month
  for (let i = adjustedFirstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, month: 'prev' as const });
  }
  
  // Add days from the current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ 
      day: i, 
      month: 'current' as const, 
      status: daysWithStatus[i] || 'neutral',
      isToday: isCurrentMonth && today === i
    });
  }
  
  // Add days from the next month
  const remainingCells = 42 - calendarDays.length; // 6 rows x 7 days = 42 cells
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({ day: i, month: 'next' as const });
  }

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

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-primary" />
          <h3 className="text-xl font-medium">{month}, {year}</h3>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "px-3 py-1 rounded-full",
            status === 'Active' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : 
                                "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
          )}
        >
          {status}
        </Badge>
      </div>

      <CalendarGrid 
        daysOfWeek={daysOfWeek}
        calendarDays={calendarDays}
        onDayClick={handleDayClick}
      />

      {selectedDay && selectedDayTrades.length > 0 && (
        <Card className="mt-4 animate-in slide-in-from-top-4 duration-300">
          <CardContent className="pt-4">
            <h4 className="text-lg font-medium mb-2 flex items-center">
              <span>עסקאות ליום</span>
              <span className="px-2">{selectedDay.split('-')[0]}</span>
              <span>{month}</span>
            </h4>
            <TradeDataTable trades={selectedDayTrades} />
          </CardContent>
        </Card>
      )}
      
      {selectedDay && selectedDayTrades.length === 0 && (
        <Card className="mt-4 animate-in slide-in-from-top-4 duration-300">
          <CardContent className="pt-4 text-center py-8">
            <p className="text-muted-foreground">אין עסקאות ליום זה</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonthCalendar;
