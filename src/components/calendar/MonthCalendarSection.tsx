
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import MonthCalendar from '@/components/MonthCalendar';
import { TradeRecord } from '@/lib/trade-analysis';
import SelectedDayTrades from '@/components/calendar/SelectedDayTrades';

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
  tradesData
}: MonthCalendarSectionProps) => {
  const isCurrentMonth = currentMonth === systemCurrentMonth && currentYear === systemCurrentYear;
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  const handleDayClick = (day: number) => {
    const dayKey = `${day}-current`;
    setSelectedDay(dayKey);
  };
  
  // Get selected day trades
  const selectedDayTrades = selectedDay && tradesData?.[selectedDay] ? tradesData[selectedDay] : [];
  
  return (
    <div className="col-span-2">
      <div className="flex justify-between items-center mb-4">
        <Button 
          onClick={prevMonth} 
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          size="sm"
        >
          <ChevronRight size={16} />
          <span>חודש קודם</span>
        </Button>
        <Button 
          onClick={nextMonth} 
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          size="sm"
        >
          <span>חודש הבא</span>
          <ChevronLeft size={16} />
        </Button>
      </div>
      
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
