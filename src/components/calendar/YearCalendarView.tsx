
import React from 'react';
import { useTradingDataStore } from '@/stores/trading-data-store';
import { YearHeader } from './YearHeader';
import { MonthCard } from './MonthCard';

interface TradeDay {
  date: string;
  trades: number;
  profit: number;
  status: "Open" | "Active";
}

export interface YearCalendarViewProps {
  year: number;
  onMonthSelect: (month: string) => void;
  tradeDays?: TradeDay[];
}

export const YearCalendarView = ({ year, onMonthSelect, tradeDays = [] }: YearCalendarViewProps) => {
  // Hebrew month names
  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  
  // Get trading data from store
  const { globalTrades } = useTradingDataStore();
  
  // Process trades to calculate monthly stats
  const getMonthlyData = () => {
    // Initialize array with empty data for all months
    const monthsData = hebrewMonths.map(name => ({
      name,
      value: 0,
      trades: 0
    }));
    
    if (globalTrades.length === 0) {
      return monthsData;
    }
    
    // Calculate values for each month
    globalTrades.forEach(trade => {
      const entryDate = new Date(trade['Entry DateTime']);
      const tradeYear = entryDate.getFullYear();
      
      // Only process trades from the selected year
      if (tradeYear === year) {
        const monthIndex = entryDate.getMonth();
        monthsData[monthIndex].trades += 1;
        monthsData[monthIndex].value += trade.Net || 0;
      }
    });
    
    return monthsData;
  };
  
  const monthsData = getMonthlyData();
  
  // Current month
  const currentMonth = new Date().getMonth();
  
  return (
    <div className="w-full">
      <YearHeader year={year} />
      <div className="grid grid-cols-3 gap-4" dir="rtl">
        {monthsData.map((month, index) => (
          <MonthCard 
            key={index}
            name={month.name}
            value={month.value}
            trades={month.trades}
            isCurrentMonth={index === currentMonth}
            onClick={() => onMonthSelect(month.name)}
          />
        ))}
      </div>
    </div>
  );
};

