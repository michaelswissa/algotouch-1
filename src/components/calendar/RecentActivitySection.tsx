
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradingDataStore } from '@/stores/trading-data-store';

interface TradeDay {
  date: string;
  trades: number;
  profit: number;
  status: "Open" | "Active";
}

interface RecentActivitySectionProps {
  tradeDays?: TradeDay[];
}

export const RecentActivitySection = ({ tradeDays: propTradeDays }: RecentActivitySectionProps = {}) => {
  // Get real trade data from store
  const { globalTrades } = useTradingDataStore();
  
  useEffect(() => {
    console.log("RecentActivitySection: globalTrades count =", globalTrades.length);
  }, [globalTrades.length]);
  
  // Generate trade days from actual uploaded data
  const generateTradeDays = (): TradeDay[] => {
    if (globalTrades.length === 0) {
      console.log("RecentActivitySection: No global trades available");
      return [];
    }
    
    // Create real trade days from the global trades
    const tradeMap = new Map<string, { count: number, profit: number }>();
    
    globalTrades.forEach(trade => {
      if (!trade['Entry DateTime']) return;

      const date = new Date(trade['Entry DateTime']).toISOString().split('T')[0];
      if (!tradeMap.has(date)) {
        tradeMap.set(date, { count: 0, profit: 0 });
      }
      
      const current = tradeMap.get(date)!;
      current.count += 1;
      current.profit += trade.Net || 0;
      tradeMap.set(date, current);
    });
    
    // Convert map to array of TradeDay objects
    const result: TradeDay[] = [];
    tradeMap.forEach((value, date) => {
      result.push({
        date,
        trades: value.count,
        profit: value.profit,
        status: value.profit >= 0 ? "Active" : "Open" // Set status based on profit
      });
    });
    
    // Log to help with debugging
    console.log("RecentActivitySection: Generated", result.length, "trade days");
    
    // Sort by date descending and take the 5 most recent
    return result
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  // Use provided tradeDays from props if available, otherwise generate from globalTrades
  const tradeDaysToDisplay = propTradeDays && propTradeDays.length > 0 ? propTradeDays : generateTradeDays();

  useEffect(() => {
    console.log("RecentActivitySection: Displaying", tradeDaysToDisplay.length, "trade days");
  }, [tradeDaysToDisplay.length]);

  // If no data, show message
  if (tradeDaysToDisplay.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="text-primary" size={18} />
            <span>פעילות אחרונה</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>העלה קובץ עסקאות כדי לראות פעילות אחרונה</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="text-primary" size={18} />
          <span>פעילות אחרונה</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tradeDaysToDisplay.map((day, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
              <div>
                <div className="font-medium">{new Date(day.date).toLocaleDateString('he-IL')}</div>
                <div className="text-sm text-muted-foreground">{day.trades} עסקאות</div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={day.status === "Active" ? "default" : "outline"} className="mr-2">
                  {day.status === "Active" ? "רווח" : "הפסד"}
                </Badge>
                
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  day.profit > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {day.profit > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  <span>${Math.abs(day.profit).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
