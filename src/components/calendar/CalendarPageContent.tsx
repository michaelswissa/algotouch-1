
import React from 'react';
import { YearCalendarView } from '@/components/calendar/YearCalendarView';
import { MonthCalendarSection } from '@/components/calendar/MonthCalendarSection';
import { RecentActivitySection } from '@/components/calendar/RecentActivitySection';
import { EconomicCalendarSection } from '@/components/calendar/EconomicCalendarSection';

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
  tradesByDay: Record<string, any>;
}

export const CalendarPageContent = ({
  viewMode,
  currentMonth,
  currentYear,
  prevMonth,
  nextMonth,
  systemCurrentMonth,
  systemCurrentYear,
  handleMonthSelect,
  handleBackToYear,
  tradesByDay
}: CalendarPageContentProps) => {
  return (
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
          systemCurrentMonth={systemCurrentMonth}
          systemCurrentYear={systemCurrentYear}
          onBackToYear={handleBackToYear}
          tradesData={tradesByDay}
        />
      )}
      
      <RecentActivitySection />
      
      <EconomicCalendarSection />
    </div>
  );
};
