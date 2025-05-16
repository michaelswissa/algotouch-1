
import React from 'react';
import { YearCalendarView } from '@/components/calendar/YearCalendarView';
import { MonthCalendarSection } from '@/components/calendar/MonthCalendarSection';
import { RecentActivitySection } from '@/components/calendar/RecentActivitySection';
// Import the component using default import syntax to be more explicit
import EconomicCalendarSection from '@/components/calendar/EconomicCalendarSection';

interface TradeDay {
  date: string;
  trades: number;
  profit: number;
  status: "Open" | "Active";
}

interface CalendarPageContentProps {
  viewMode: 'year' | 'month';
  currentMonth: string;
  currentYear: number;
  prevMonth: () => void;
  nextMonth: () => void;
  systemCurrentMonth: string;
  systemCurrentYear: number;
  handleMonthSelect: (month: string) => void;
  handleBackToYear: () => void;
  tradeDays: TradeDay[];
  tradesByDay: Record<string, any>;
}

// Use function declaration for the main component for cleaner initialization
export function CalendarPageContent({
  viewMode,
  currentMonth,
  currentYear,
  prevMonth,
  nextMonth,
  systemCurrentMonth,
  systemCurrentYear,
  handleMonthSelect,
  handleBackToYear,
  tradeDays,
  tradesByDay
}: CalendarPageContentProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {viewMode === 'year' ? (
        // Year view - show all months
        <div className="col-span-2">
          <YearCalendarView 
            year={currentYear} 
            onMonthSelect={handleMonthSelect} 
            tradeDays={tradeDays}
          />
        </div>
      ) : (
        // Month view - show days in selected month
        <MonthCalendarSection 
          currentMonth={currentMonth}
          currentYear={currentYear}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          systemCurrentMonth={systemCurrentMonth}
          systemCurrentYear={systemCurrentYear}
          onBackToYear={handleBackToYear}
          tradesData={tradesByDay}
        />
      )}
      
      {/* Pass tradeDays prop to RecentActivitySection */}
      <div className="lg:col-span-1">
        <RecentActivitySection tradeDays={tradeDays} />
        
        <div className="mt-6">
          <EconomicCalendarSection />
        </div>
      </div>
    </div>
  );
}
