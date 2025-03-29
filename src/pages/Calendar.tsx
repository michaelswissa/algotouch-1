
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { MonthCalendarSection } from '@/components/calendar/MonthCalendarSection';
import { RecentActivitySection } from '@/components/calendar/RecentActivitySection';
import { EconomicCalendarSection } from '@/components/calendar/EconomicCalendarSection';

interface TradeDay {
  date: string;
  trades: number;
  profit: number;
  status: "Open" | "Active";
}

// Hebrew month names
const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const CalendarPage = () => {
  // Current date for default month/year
  const currentDate = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [currentMonth, setCurrentMonth] = useState(hebrewMonths[currentDate.getMonth()]);
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());

  // Mock trade days data for the calendar
  const tradeDays: TradeDay[] = [
    { date: "2023-03-01", trades: 5, profit: 243.50, status: "Open" },
    { date: "2023-03-02", trades: 3, profit: -120.75, status: "Active" },
    { date: "2023-03-05", trades: 7, profit: 385.20, status: "Open" },
    { date: "2023-03-08", trades: 2, profit: -85.30, status: "Open" },
    { date: "2023-03-10", trades: 4, profit: 195.60, status: "Active" },
    { date: "2023-03-15", trades: 6, profit: 310.90, status: "Open" },
    { date: "2023-03-17", trades: 3, profit: -150.45, status: "Active" },
    { date: "2023-03-22", trades: 5, profit: 270.80, status: "Open" },
    { date: "2023-03-25", trades: 4, profit: -110.25, status: "Active" },
    { date: "2023-03-28", trades: 8, profit: 420.70, status: "Open" },
  ];

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

  return (
    <Layout>
      <div className="tradervue-container py-6 bg-dots">
        <CalendarHeader 
          selectedDate={selectedDate} 
          setSelectedDate={(date) => {
            if (date) {
              setSelectedDate(date);
              setCurrentMonth(hebrewMonths[date.getMonth()]);
              setCurrentYear(date.getFullYear());
            }
          }} 
        />
        
        <div className="flex flex-col max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MonthCalendarSection 
              currentMonth={currentMonth}
              currentYear={currentYear}
              prevMonth={prevMonth}
              nextMonth={nextMonth}
              systemCurrentMonth={hebrewMonths[currentDate.getMonth()]}
              systemCurrentYear={currentDate.getFullYear()}
            />
            
            <RecentActivitySection tradeDays={tradeDays.slice(0, 5)} />
          </div>
          
          <EconomicCalendarSection />
        </div>
      </div>
    </Layout>
  );
};

export default CalendarPage;
