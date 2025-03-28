
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronRight, ChevronLeft } from 'lucide-react';
import MonthCalendar from '@/components/MonthCalendar';
import YearCalendarView from './YearCalendarView';

interface MonthCalendarSectionProps {
  currentMonth: string;
  currentYear: number;
  prevMonth: () => void;
  nextMonth: () => void;
}

export const MonthCalendarSection = ({ 
  currentMonth, 
  currentYear, 
  prevMonth, 
  nextMonth 
}: MonthCalendarSectionProps) => {
  // Show year view by default, but can switch to month view
  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  // Hebrew month names
  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  // Mock profit/loss data for each month
  const mockMonthlyData = [
    { name: 'ינואר', value: 0, profit: 1250.75, hasTradeData: true },
    { name: 'פברואר', value: 1, profit: -450.25, hasTradeData: true },
    { name: 'מרץ', value: 2, profit: 780.50, hasTradeData: true },
    { name: 'אפריל', value: 3, profit: 1450.30, hasTradeData: true },
    { name: 'מאי', value: 4, profit: -320.10, hasTradeData: true },
    { name: 'יוני', value: 5, profit: 650.90, hasTradeData: true },
    { name: 'יולי', value: 6, profit: -150.40, hasTradeData: true },
    { name: 'אוגוסט', value: 7, profit: 920.80, hasTradeData: true },
    { name: 'ספטמבר', value: 8, profit: -670.20, hasTradeData: true },
    { name: 'אוקטובר', value: 9, profit: 1100.60, hasTradeData: true },
    { name: 'נובמבר', value: 10, profit: 580.30, hasTradeData: true },
    { name: 'דצמבר', value: 11, profit: 0, hasTradeData: false }
  ];

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonthIndex(monthIndex);
    setViewMode('month');
  };

  const backToYearView = () => {
    setViewMode('year');
  };

  const getCurrentMonthIndex = () => {
    return hebrewMonths.findIndex(month => month === currentMonth);
  };

  return (
    <div className="lg:col-span-2">
      <Card className="glass-card-2025 overflow-hidden hover-glow">
        <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gradient-to-r from-background to-background/50">
          <CardTitle className="text-xl flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            <span className="neon-text">לוח שנה מסחר</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {viewMode === 'month' && (
              <>
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {currentMonth} {currentYear}
                </div>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={backToYearView}
                  className="mr-2 text-xs"
                >
                  חזרה לתצוגת שנה
                </Button>
              </>
            )}
            {viewMode === 'year' && (
              <div className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                {currentYear}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex justify-center">
            <div className="w-full max-w-md pb-2">
              {viewMode === 'year' ? (
                <YearCalendarView 
                  year={currentYear}
                  months={mockMonthlyData}
                  onMonthSelect={handleMonthSelect}
                  selectedMonth={selectedMonthIndex}
                />
              ) : (
                <MonthCalendar 
                  month={currentMonth} 
                  year={currentYear} 
                  status="Open" 
                  onDayClick={(day) => console.log(`Selected day: ${day}`)}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
