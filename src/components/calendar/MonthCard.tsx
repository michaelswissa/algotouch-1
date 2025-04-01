
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthCardProps {
  name: string;
  value: number;
  trades: number;
  isCurrentMonth: boolean;
  onClick: () => void;
}

export const MonthCard = ({ name, value, trades, isCurrentMonth, onClick }: MonthCardProps) => {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
        value > 0 ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/40" : 
        value < 0 ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/40" : 
        "bg-card",
        isCurrentMonth && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <h3 className="text-lg font-bold text-center mb-2">{name}</h3>
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <span className="text-muted-foreground">עסקאות:</span> {trades}
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-sm",
            value > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : 
            value < 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : 
            "bg-secondary/50 text-secondary-foreground"
          )}>
            {value > 0 ? (
              <>
                <ArrowUp size={14} />
                <span>${value.toFixed(2)}</span>
              </>
            ) : value < 0 ? (
              <>
                <ArrowDown size={14} />
                <span>${Math.abs(value).toFixed(2)}</span>
              </>
            ) : (
              <span>$0.00</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
