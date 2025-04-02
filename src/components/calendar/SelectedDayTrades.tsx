
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import TradeDataTable from '@/components/TradeDataTable';
import { TradeRecord } from '@/lib/trade-analysis';
import { Calendar, TrendingUp, TrendingDown, Clock, DollarSign, BarChart, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SelectedDayTradesProps {
  selectedDay: string | null;
  selectedDayTrades: TradeRecord[];
  month: string;
}

const SelectedDayTrades = ({ selectedDay, selectedDayTrades, month }: SelectedDayTradesProps) => {
  if (!selectedDay) return null;

  const dayNumber = selectedDay.split('-')[0];
  
  // If no trades for this day, show empty state
  if (!selectedDayTrades || selectedDayTrades.length === 0) {
    return (
      <Card className="mt-4 animate-in slide-in-from-top-4 duration-300 shadow-sm">
        <CardContent className="pt-4 text-center py-12">
          <Calendar size={32} className="text-muted-foreground mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground">אין עסקאות ליום זה</p>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate total profit/loss from actual data
  const totalPnL = selectedDayTrades.reduce((total, trade) => total + (trade.Net || 0), 0);
  
  // Calculate average trade size
  const avgTradeSize = selectedDayTrades.length > 0
    ? selectedDayTrades.reduce((total, trade) => total + Math.abs(trade.Net || 0), 0) / selectedDayTrades.length
    : 0;
  
  // Calculate win/loss ratio
  const winningTrades = selectedDayTrades.filter(trade => trade.Net > 0).length;
  const losingTrades = selectedDayTrades.filter(trade => trade.Net < 0).length;
  const winRate = selectedDayTrades.length > 0 
    ? Math.round((winningTrades / selectedDayTrades.length) * 100) 
    : 0;

  return (
    <Card className="mt-4 animate-in slide-in-from-top-4 duration-300 border-primary/20 shadow-md">
      <CardContent className="pt-4">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h4 className="text-lg font-medium flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <span>עסקאות ליום</span>
            <span className="px-2 py-0.5 bg-primary/10 rounded-full text-primary">{dayNumber}</span>
            <span>{month}</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 mx-2">
              {selectedDayTrades.length} עסקאות
            </Badge>
          </h4>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm shadow-sm",
              totalPnL > 0 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {totalPnL > 0 ? (
                <>
                  <TrendingUp size={15} />
                  <span className="font-medium">רווח: ${totalPnL.toFixed(2)}</span>
                </>
              ) : (
                <>
                  <TrendingDown size={15} />
                  <span className="font-medium">הפסד: ${Math.abs(totalPnL).toFixed(2)}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm px-2 py-1 bg-secondary/50 rounded-full">
              <Clock size={14} className="text-muted-foreground" />
              <span>זמן ממוצע: -- דקות</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-secondary/20 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-primary" />
              <span className="text-sm font-medium">עסקה ממוצעת</span>
            </div>
            <span className="font-semibold">${avgTradeSize.toFixed(2)}</span>
          </div>
          
          <div className="bg-secondary/20 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart size={16} className="text-primary" />
              <span className="text-sm font-medium">אחוז הצלחה</span>
            </div>
            <span className="font-semibold">{winRate}%</span>
          </div>
          
          <div className="bg-secondary/20 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-primary" />
              <span className="text-sm font-medium">רווח / הפסד</span>
            </div>
            <span className="font-semibold">{winningTrades}/{losingTrades}</span>
          </div>
        </div>
        
        <TradeDataTable trades={selectedDayTrades} />
      </CardContent>
    </Card>
  );
};

export default SelectedDayTrades;
