
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPageHeaderProps {
  viewMode: 'year' | 'month';
  currentYear: number;
  prevYear: () => void;
  nextYear: () => void;
}

export const CalendarPageHeader = ({ 
  viewMode, 
  currentYear, 
  prevYear, 
  nextYear 
}: CalendarPageHeaderProps) => {
  if (viewMode !== 'year') return null;
  
  return (
    <div className="flex justify-between items-center mb-4">
      <Button 
        onClick={prevYear} 
        variant="outline"
        className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        size="sm"
      >
        <ChevronRight size={16} />
        <span>שנה קודמת</span>
      </Button>
      <Button 
        onClick={nextYear} 
        variant="outline"
        className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        size="sm"
      >
        <span>שנה הבאה</span>
        <ChevronLeft size={16} />
      </Button>
    </div>
  );
};
