
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, CalendarDays } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CalendarHeaderProps {
  selectedDate: Date;
  setSelectedDate: (date: Date | undefined) => void;
}

export const CalendarHeader = ({ selectedDate, setSelectedDate }: CalendarHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <CalendarDays size={30} className="text-primary" />
        <span className="text-gradient-blue">לוח שנה</span>
      </h1>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="border-primary/30 text-primary flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="font-medium">בחר תאריך</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
