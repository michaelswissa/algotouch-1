
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface MonthHeaderProps {
  prevMonth: () => void;
  nextMonth: () => void;
}

export const MonthHeader = ({ prevMonth, nextMonth }: MonthHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <Button 
        onClick={prevMonth} 
        variant="outline"
        className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        size="sm"
      >
        <ChevronRight size={16} />
        <span>חודש קודם</span>
      </Button>
      <Button 
        onClick={nextMonth} 
        variant="outline"
        className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        size="sm"
      >
        <span>חודש הבא</span>
        <ChevronLeft size={16} />
      </Button>
    </div>
  );
};
