
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthHeaderProps {
  currentMonth: string;
  currentYear: number;
  prevMonth: () => void;
  nextMonth: () => void;
  onBackToYear?: () => void;
}

export const MonthHeader = ({ 
  currentMonth, 
  currentYear,
  prevMonth, 
  nextMonth,
  onBackToYear
}: MonthHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold flex items-center">
          <Calendar className="mr-2 text-primary" size={20} />
          <span>{currentMonth} {currentYear}</span>
        </h2>
        
        {onBackToYear && (
          <Button 
            onClick={onBackToYear} 
            variant="ghost" 
            size="sm" 
            className="ml-4 text-primary hover:text-primary hover:bg-primary/10"
          >
            חזרה לתצוגת שנה
          </Button>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={prevMonth} 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 border-primary/30 text-primary hover:bg-primary/10"
        >
          <ChevronRight size={16} />
        </Button>
        
        <Button 
          onClick={nextMonth} 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 border-primary/30 text-primary hover:bg-primary/10"
        >
          <ChevronLeft size={16} />
        </Button>
      </div>
    </div>
  );
};
