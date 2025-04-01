
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { YearCalendarView } from '@/components/calendar/YearCalendarView';
import { MonthCalendarSection } from '@/components/calendar/MonthCalendarSection';
import { RecentActivitySection } from '@/components/calendar/RecentActivitySection';
import { EconomicCalendarSection } from '@/components/calendar/EconomicCalendarSection';
import { mockTradeData, mockDaysWithStatus } from '@/components/calendar/mockTradeData';
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
  
  // State for trades data
  const [tradesData, setTradesData] = useState<Record<string, TradeRecord[]>>({});
  const traderStore = useTradingDataStore();
  
  // Subscribe to store changes and initialize data
  useEffect(() => {
    console.log("Calendar: Initializing with store data", traderStore.tradesByDay);
    
    // Set initial data
    setTradesData(traderStore.tradesByDay);
    
    // Subscribe to store changes
    const unsubscribe = useTradingDataStore.subscribe(
      (state) => {
        console.log("Calendar: Store updated", state.tradesByDay);
        setTradesData(state.tradesByDay);
      }
    );
    
    // Force update on mount to ensure data is populated
    traderStore.updateTradesByDay();
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Generate trade days for the recent activity section
  const generateTradeDays = (): TradeDay[] => {
    if (traderStore.globalTrades.length === 0) {
      // Return mock data if no real trades exist
      return [
        { date: "2023-03-01", trades: 5, profit: 243.50, status: "Open" },
        { date: "2023-03-02", trades: 3, profit: -120.75, status: "Active" },
        { date: "2023-03-05", trades: 7, profit: 385.20, status: "Open" },
        { date: "2023-03-08", trades: 2, profit: -85.30, status: "Open" },
        { date: "2023-03-10", trades: 4, profit: 195.60, status: "Active" },
      ];
    }
    
    // Create real trade days from the global trades
    const tradeMap = new Map<string, { count: number, profit: number }>();
    
    traderStore.globalTrades.forEach(trade => {
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
        status: Math.random() > 0.5 ? "Open" : "Active" // Random status for demonstration
      });
    });
    
    // Sort by date descending and take the 5 most recent
    return result
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  // Mock trade days data for the calendar with correct status types
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

  // Check if we have real data to display
  const hasRealData = Object.keys(tradesData).length > 0;
  console.log("Calendar rendering with:", hasRealData ? "Real data" : "Mock data", tradesData);

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
              // Month view - show days in selected month
              <MonthCalendarSection 
                currentMonth={currentMonth}
                currentYear={currentYear}
                prevMonth={prevMonth}
                nextMonth={nextMonth}
                systemCurrentMonth={hebrewMonths[currentDate.getMonth()]}
                systemCurrentYear={currentDate.getFullYear()}
                onBackToYear={handleBackToYear}
                tradesData={hasRealData ? tradesData : mockTradeData}
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
