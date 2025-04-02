
import React from 'react';
import { TradeRecord } from '@/lib/trade-analysis';
import CalendarDayCell from './CalendarDayCell';
import { getTradeCount, getDailyPnL, getTradesPreview } from './TradeUtils';

interface CalendarDay {
  day: number;
  month: 'current' | 'prev' | 'next';
  status?: 'positive' | 'negative' | 'neutral';
  isToday?: boolean;
}

interface CalendarGridProps {
  daysOfWeek: string[];
  calendarDays: CalendarDay[];
  onDayClick: (day: number, month: 'current' | 'prev' | 'next') => void;
  selectedDay?: string | null;
  tradesData?: Record<string, TradeRecord[]>;
}

const CalendarGrid = ({ 
  daysOfWeek, 
  calendarDays, 
  onDayClick, 
  selectedDay, 
  tradesData = {} 
}: CalendarGridProps) => {
  // Log data for debugging
  React.useEffect(() => {
    console.log("CalendarGrid rendered with tradesData keys:", Object.keys(tradesData));
    console.log("Selected day:", selectedDay);
  }, [tradesData, selectedDay]);

  // Create a getTradesPreviewWithData function to use with CalendarDayCell
  const getTradesPreviewWithData = (day: number, month: 'current' | 'prev' | 'next') => {
    return getTradesPreview(day, month, tradesData);
  };

  return (
    <div className="w-full mt-2">
      <div className="grid grid-cols-7 gap-1 mb-1 text-center" dir="rtl">
        {daysOfWeek.map((day, index) => (
          <div key={index} className="py-2 text-sm font-medium text-secondary-foreground bg-secondary/30 rounded-sm">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2 text-center" dir="rtl">
        {calendarDays.map((dayObj, index) => {
          // Always format the day key consistently
          const dayKey = dayObj.month === 'current' ? `${dayObj.day}-current` : `${dayObj.day}-${dayObj.month}`;
          const isSelected = selectedDay === dayKey;
          const tradeCount = getTradeCount(dayObj.day, dayObj.month, tradesData);
          const dailyPnL = getDailyPnL(dayObj.day, dayObj.month, tradesData);
          const hasTrades = tradeCount > 0 && dayObj.month === 'current';
          
          return (
            <CalendarDayCell
              key={index}
              dayObj={dayObj}
              index={index}
              isSelected={isSelected}
              tradeCount={tradeCount}
              dailyPnL={dailyPnL}
              hasTrades={hasTrades}
              onDayClick={onDayClick}
              getTradesPreview={getTradesPreviewWithData}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
