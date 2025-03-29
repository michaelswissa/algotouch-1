
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { YearCalendarView } from '@/components/calendar/YearCalendarView';
import { MonthCalendarSection } from '@/components/calendar/MonthCalendarSection';
import { RecentActivitySection } from '@/components/calendar/RecentActivitySection';
import { EconomicCalendarSection } from '@/components/calendar/EconomicCalendarSection';
import { mockTradeData, mockDaysWithStatus } from '@/components/calendar/mockTradeData';
import { TradeRecord } from '@/lib/trade-analysis';

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
  const [tradesData, setTradesData] = useState<Record<string, TradeRecord[]>>(mockTradeData);

  // Generate random trade data for all months when the component mounts
  useEffect(() => {
    generateRandomTradeDataForAllMonths();
  }, []);

  // Mock trade days data for the calendar with correct status types
  const tradeDays: TradeDay[] = [
    { date: "2023-03-01", trades: 5, profit: 243.50, status: "Open" },
    { date: "2023-03-02", trades: 3, profit: -120.75, status: "Active" },
    { date: "2023-03-05", trades: 7, profit: 385.20, status: "Open" },
    { date: "2023-03-08", trades: 2, profit: -85.30, status: "Open" },
    { date: "2023-03-10", trades: 4, profit: 195.60, status: "Active" },
  ];

  // Generate random trade data for all months
  const generateRandomTradeDataForAllMonths = () => {
    const allMonthsTradeData: Record<string, TradeRecord[]> = {};
    
    // For each month, generate some random trades
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const month = monthIndex + 1;
      const daysInMonth = new Date(currentYear, month, 0).getDate();
      
      // Generate between 5-15 random days with trades for each month
      const daysCount = Math.floor(Math.random() * 11) + 5;
      
      for (let i = 0; i < daysCount; i++) {
        const day = Math.floor(Math.random() * daysInMonth) + 1;
        const dayKey = `${day}-current`;
        
        // 1-4 trades per day
        const tradesCount = Math.floor(Math.random() * 4) + 1;
        const dayTrades = [];
        
        for (let j = 0; j < tradesCount; j++) {
          const isProfit = Math.random() > 0.4; // 60% chance of profit
          const amount = Math.floor(Math.random() * 1000) + 100;
          
          dayTrades.push({
            AccountNumber: "12345",
            Contract: ["NQ", "ES", "MES", "MNQ", "YM", "RTY"][Math.floor(Math.random() * 6)],
            'Signal Name': ["Breakout", "Trend Follow", "Reversal", "Support", "Resistance", "VWAP", "Gap"][Math.floor(Math.random() * 7)],
            Side: Math.random() > 0.5 ? 'Long' : 'Short',
            'Entry DateTime': `2023-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}T${9 + Math.floor(Math.random() * 7)}:${Math.floor(Math.random() * 60)}:00`,
            'Exit DateTime': `2023-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}T${12 + Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 60)}:00`,
            EntryPrice: 15000 + Math.floor(Math.random() * 1000),
            ExitPrice: 15000 + Math.floor(Math.random() * 1000),
            ProfitLoss: isProfit ? amount : -amount,
            Net: isProfit ? amount * 0.95 : -amount * 1.05,
            Equity: 25000 + Math.floor(Math.random() * 5000)
          });
        }
        
        allMonthsTradeData[dayKey] = dayTrades;
      }
    }
    
    setTradesData(allMonthsTradeData);
  };

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
                tradesData={tradesData}
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
