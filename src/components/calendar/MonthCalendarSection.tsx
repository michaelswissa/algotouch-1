
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronRight, ChevronLeft } from 'lucide-react';
import MonthCalendar from '@/components/MonthCalendar';

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
  return (
    <div className="lg:col-span-2">
      <Card className="glass-card-2025 overflow-hidden hover-glow">
        <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gradient-to-r from-background to-background/50">
          <CardTitle className="text-xl flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            <span className="neon-text">לוח שנה מסחר</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
              {currentMonth} {currentYear}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex justify-center">
            <div className="w-full max-w-md pb-2">
              <MonthCalendar 
                month={currentMonth} 
                year={currentYear} 
                status="Open" 
                onDayClick={(day) => console.log(`Selected day: ${day}`)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
