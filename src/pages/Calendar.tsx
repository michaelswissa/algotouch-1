
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { YearCalendarView } from '@/components/calendar/YearCalendarView';
import { MonthCalendarSection } from '@/components/calendar/MonthCalendarSection';
import { RecentActivitySection } from '@/components/calendar/RecentActivitySection';
import { EconomicCalendarSection } from '@/components/calendar/EconomicCalendarSection';
import { TradeRecord } from '@/lib/trade-analysis';
import { useTradingDataStore } from '@/stores/trading-data-store';

// Hebrew month names
const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// Define the TradeDay type with the correct status values
interface TradeDay {
  date: string;
  trades: number;
  profit: number;
  status: "Open" | "Active";
}

const CalendarPage = () => {
  // Current date for default month/year
  const currentDate = new Date();
  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [currentMonth, setCurrentMonth] = useState(hebrewMonths[currentDate.getMonth()]);
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  
  // State for trades data from the store
  const { tradesByDay, globalTrades, lastUpdateTimestamp, updateTradesByDay } = useTradingDataStore();
  
  // Force an update when component mounts and whenever the store changes
  useEffect(() => {
    console.log("Calendar: Initializing with store data", 
      `Global trades: ${globalTrades.length}`,
      `Days with trades: ${Object.keys(tradesByDay).length}`,
      `Last update: ${new Date(lastUpdateTimestamp).toLocaleTimeString()}`
    );
    
    // Force an update if we have global trades but no days organized
    if (globalTrades.length > 0 && Object.keys(tradesByDay).length === 0) {
      console.log("Calendar: Found global trades but no organized days, updating...");
      updateTradesByDay();
    }
  }, [globalTrades, tradesByDay, lastUpdateTimestamp, updateTradesByDay]);

  // Generate trade days for the recent activity section - using real data
  const generateTradeDays = (): TradeDay[] => {
    if (globalTrades.length === 0) {
      // Return empty array if no real trades exist
      return [];
    }
    
    // Create real trade days from the global trades
    const tradeMap = new Map<string, { count: number, profit: number }>();
    
    globalTrades.forEach(trade => {
      const date = new Date(trade['Entry DateTime']).toISOString().split('T')[0];
      if (!tradeMap.has(date)) {
        tradeMap.set(date, { count: 0, profit: 0 });
      }
      
      const current = tradeMap.get(date)!;
      current.count += 1;
      current.profit += trade.Net || 0;
      tradeMap.set(date, current);
    });
    
    // Convert map to array of TradeDay objects
    const result: TradeDay[] = [];
    tradeMap.forEach((value, date) => {
      result.push({
        date,
        trades: value.count,
        profit: value.profit,
        status: "Open" // Default status
      });
    });
    
    // Sort by date descending and take the 5 most recent
    return result
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  // Generate trade days based on real data
  const tradeDays: TradeDay[] = generateTradeDays();

  // Navigate to previous month
  const prevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
    setCurrentMonth(hebrewMonths[newDate.getMonth()]);
    setCurrentYear(newDate.getFullYear());
  };

  // Navigate to next month
  const nextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
    setCurrentMonth(hebrewMonths[newDate.getMonth()]);
    setCurrentYear(newDate.getFullYear());
  };

  // Handle month selection from year view
  const handleMonthSelect = (month: string) => {
    const monthIndex = hebrewMonths.indexOf(month);
    if (monthIndex !== -1) {
      const newDate = new Date(currentYear, monthIndex, 1);
      setSelectedDate(newDate);
      setCurrentMonth(month);
      setViewMode('month');
    }
  };

  // Return to year view
  const handleBackToYear = () => {
    setViewMode('year');
  };

  // Log state for debugging
  console.log("Calendar render state:", { 
    tradesByDayCount: Object.keys(tradesByDay).length,
    globalTradesCount: globalTrades.length
  });

  return (
    <Layout>
      <div className="tradervue-container py-6 bg-dots">
        <div className="flex flex-col max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {viewMode === 'year' ? (
              // Year view - show all months
              <div className="col-span-2">
                <YearCalendarView 
                  year={currentYear} 
                  onMonthSelect={handleMonthSelect} 
                />
              </div>
            ) : (
              // Month view - show days in selected month - always use real data
              <MonthCalendarSection 
                currentMonth={currentMonth}
                currentYear={currentYear}
                prevMonth={prevMonth}
                nextMonth={nextMonth}
                systemCurrentMonth={hebrewMonths[currentDate.getMonth()]}
                systemCurrentYear={currentDate.getFullYear()}
                onBackToYear={handleBackToYear}
                tradesData={tradesByDay}
              />
            )}
            
            <RecentActivitySection tradeDays={tradeDays} />
          </div>
          
          <EconomicCalendarSection />
        </div>
      </div>
    </Layout>
  );
};

export default CalendarPage;
