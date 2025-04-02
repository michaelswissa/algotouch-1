
import { useState, useEffect } from 'react';
import { useTradingDataStore } from '@/stores/trading-data-store';
import { useToast } from "@/hooks/use-toast";

// Hebrew month names
const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// Define the TradeDay type
interface TradeDay {
  date: string;
  trades: number;
  profit: number;
  status: "Open" | "Active";
}

export const useCalendar = () => {
  const { toast } = useToast();
  
  // Current date for default month/year
  const currentDate = new Date();
  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [currentMonth, setCurrentMonth] = useState(hebrewMonths[currentDate.getMonth()]);
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [hasShownToast, setHasShownToast] = useState(false);
  
  // State for trades data from the store
  const { tradesByDay, globalTrades, lastUpdateTimestamp, updateTradesByDay } = useTradingDataStore();
  
  // For debugging - log data on mount and when values change
  useEffect(() => {
    console.log("useCalendar: Initial state", { 
      globalTradesCount: globalTrades.length,
      tradesByDayCount: Object.keys(tradesByDay).length,
      viewMode
    });
    
    if (globalTrades.length > 0) {
      console.log("useCalendar: Sample trades:", globalTrades.slice(0, 2));
    }
    
    if (Object.keys(tradesByDay).length > 0) {
      console.log("useCalendar: Days with trades:", Object.keys(tradesByDay));
      
      // Check data in a sample day
      const sampleDay = Object.keys(tradesByDay)[0];
      console.log(`Sample day ${sampleDay} has:`, 
        tradesByDay[sampleDay].length, 
        "trades with total profit:", 
        tradesByDay[sampleDay].reduce((sum, t) => sum + (t.Net || 0), 0)
      );
    }
  }, [globalTrades.length, tradesByDay, viewMode]);
  
  // Ensure tradesByDay is updated whenever globalTrades changes
  useEffect(() => {
    if (globalTrades.length > 0) {
      console.log("useCalendar: Ensuring tradesByDay is updated with globalTrades");
      updateTradesByDay();
    }
  }, [globalTrades, updateTradesByDay]);
  
  // Show toast when trades are loaded - only once
  useEffect(() => {
    if (globalTrades.length > 0 && !hasShownToast) {
      console.log("Calendar: Found trades data:", 
        `Global trades: ${globalTrades.length}`,
        `Days with trades: ${Object.keys(tradesByDay).length}`
      );
      
      toast({
        title: "נתוני מסחר נטענו",
        description: `${globalTrades.length} עסקאות ב-${Object.keys(tradesByDay).length} ימים נטענו ללוח השנה`
      });
      
      setHasShownToast(true);
    }
  }, [globalTrades, tradesByDay, toast, hasShownToast]);

  // Generate trade days for the recent activity section using real data
  const generateTradeDays = (): TradeDay[] => {
    if (globalTrades.length === 0) {
      console.log("useCalendar: No trades data available for generating trade days");
      return [];
    }
    
    // Create real trade days from the global trades
    const tradeMap = new Map<string, { count: number, profit: number }>();
    
    globalTrades.forEach(trade => {
      if (!trade['Entry DateTime']) return;
      
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
        status: value.profit >= 0 ? "Active" : "Open" // Set status based on profit
      });
    });
    
    // Log detailed information
    console.log("useCalendar: Generated", result.length, "trade days for recent activity");
    
    // Sort by date descending and take the 5 most recent
    return result
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
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

  // Navigate to previous year
  const prevYear = () => {
    setCurrentYear(prev => prev - 1);
  };

  // Navigate to next year
  const nextYear = () => {
    setCurrentYear(prev => prev + 1);
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

  // Trade days data for the calendar
  const tradeDays: TradeDay[] = generateTradeDays();

  return {
    viewMode,
    selectedDate,
    currentMonth,
    currentYear,
    tradeDays,
    tradesByDay,
    lastUpdateTimestamp,
    hebrewMonths,
    prevMonth,
    nextMonth,
    prevYear,
    nextYear,
    handleMonthSelect,
    handleBackToYear
  };
};
