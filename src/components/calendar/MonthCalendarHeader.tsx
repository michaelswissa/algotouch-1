
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MonthCalendarHeaderProps {
  month: string;
  year: number;
  status?: 'Open' | 'Active';
  tradesCount?: number;
}

const MonthCalendarHeader = ({ 
  month, 
  year, 
  status = 'Open',
  tradesCount = 0
}: MonthCalendarHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <CalendarDays size={20} className="text-primary" />
        <h3 className="text-xl font-semibold">{month}, {year}</h3>
      </div>
      <div className="flex items-center gap-2">
        {tradesCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  {tradesCount} עסקאות
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>סך כל העסקאות בחודש זה</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={cn(
                  "px-3 py-1 rounded-full",
                  status === 'Active' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : 
                                    "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
                )}
              >
                {status}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{status === 'Active' ? 'חודש פעיל למסחר' : 'חודש פתוח לתכנון מסחר'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default MonthCalendarHeader;
