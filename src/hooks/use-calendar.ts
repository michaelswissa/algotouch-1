
import { useState, useEffect } from 'react';
import { useTradingDataStore } from '@/stores/trading-data-store';
import { useToast } from "@/hooks/use-toast";

// Hebrew month names
const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

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

  return {
    viewMode,
    selectedDate,
    currentMonth,
    currentYear,
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
