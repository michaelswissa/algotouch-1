
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, TrendingUp, TrendingDown, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface MonthCalendarHeaderProps {
  month: string;
  year: number;
  status?: 'Open' | 'Active';
  tradesCount?: number;
  totalProfit?: number;
  onAddTrade?: () => void;
}

const MonthCalendarHeader = ({ 
  month, 
  year, 
  status = 'Open',
  tradesCount = 0,
  totalProfit = 0,
  onAddTrade
}: MonthCalendarHeaderProps) => {
  const isCurrentMonth = new Date().getMonth() === new Date(`${month} 1, ${year}`).getMonth() && 
                         new Date().getFullYear() === year;
  
  return (
    <div className="flex flex-col gap-2 mb-5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-full", 
            isCurrentMonth ? "bg-primary/10" : "bg-secondary"
          )}>
            <CalendarDays size={22} className={cn(
              isCurrentMonth ? "text-primary" : "text-secondary-foreground"
            )} />
          </div>
          <h3 className="text-2xl font-semibold">
            {month}, {year}
            {isCurrentMonth && (
              <Badge className="ml-2 bg-primary/20 text-primary border-primary/30 font-normal">
                חודש נוכחי
              </Badge>
            )}
          </h3>
        </div>
        
        <div className="flex items-center gap-3">
          {onAddTrade && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAddTrade} 
              className="text-primary border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              <CalendarRange size={16} className="mr-1" />
              הוסף עסקה
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            {tradesCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 transition-all hover:scale-105">
                      {tradesCount} עסקאות
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>סך כל העסקאות בחודש זה</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {tradesCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "px-3 py-1.5 rounded-full transition-all hover:scale-105",
                        totalProfit > 0 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {totalProfit > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {totalProfit > 0
                          ? `רווח: ${totalProfit.toFixed(2)}₪`
                          : `הפסד: ${Math.abs(totalProfit).toFixed(2)}₪`
                        }
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{totalProfit > 0 ? 'סך הרווחים' : 'סך ההפסדים'} בחודש זה</p>
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
                      "px-3 py-1 rounded-full transition-all hover:scale-105",
                      status === 'Active' 
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
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
      </div>
      
      {tradesCount > 0 && (
        <div className="bg-gradient-to-r from-background to-secondary/20 rounded-md p-1.5 text-sm text-muted-foreground flex justify-between">
          <div>
            <span className="font-medium">ממוצע יומי:</span> {(totalProfit / (tradesCount || 1)).toFixed(2)}₪
          </div>
          <div>
            <span className="font-medium">עסקה ממוצעת:</span> {(totalProfit / Math.max(1, tradesCount)).toFixed(2)}₪
          </div>
          <div>
            <span className="font-medium">ימי מסחר:</span> {Math.min(tradesCount * 2, 20)}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthCalendarHeader;
