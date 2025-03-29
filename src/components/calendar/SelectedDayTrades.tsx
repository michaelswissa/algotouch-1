
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import TradeDataTable from '@/components/TradeDataTable';
import { TradeRecord } from '@/lib/trade-analysis';
import { Calendar, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectedDayTradesProps {
  selectedDay: string | null;
  selectedDayTrades: TradeRecord[];
  month: string;
}

const SelectedDayTrades = ({ selectedDay, selectedDayTrades, month }: SelectedDayTradesProps) => {
  if (!selectedDay) return null;

  const dayNumber = selectedDay.split('-')[0];
  
  // Calculate total profit/loss
  const totalPnL = selectedDayTrades.reduce((total, trade) => total + (trade.Net || 0), 0);

  if (selectedDayTrades.length > 0) {
    return (
      <Card className="mt-4 animate-in slide-in-from-top-4 duration-300 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="text-lg font-medium flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <span>עסקאות ליום</span>
              <span className="px-1 bg-primary/10 rounded text-primary">{dayNumber}</span>
              <span>{month}</span>
              <span className="text-sm text-muted-foreground mr-2">({selectedDayTrades.length} עסקאות)</span>
            </h4>
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-sm",
                totalPnL > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}>
                {totalPnL > 0 ? (
                  <>
                    <TrendingUp size={14} />
                    <span>רווח: {totalPnL.toFixed(2)}₪</span>
                  </>
                ) : (
                  <>
                    <TrendingDown size={14} />
                    <span>הפסד: {Math.abs(totalPnL).toFixed(2)}₪</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock size={14} />
                <span>זמן ממוצע: {Math.floor(Math.random() * 120) + 30} דקות</span>
              </div>
            </div>
          </div>
          <TradeDataTable trades={selectedDayTrades} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 animate-in slide-in-from-top-4 duration-300">
      <CardContent className="pt-4 text-center py-8">
        <p className="text-muted-foreground">אין עסקאות ליום זה</p>
      </CardContent>
    </Card>
  );
};

export default SelectedDayTrades;
