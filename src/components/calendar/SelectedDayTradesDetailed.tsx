
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TradeRecord } from '@/lib/trade-analysis';
import { format, parse } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SelectedDayTradesDetailedProps {
  selectedDay: string | null;
  trades: TradeRecord[];
  month: string;
}

const SelectedDayTradesDetailed = ({ 
  selectedDay, 
  trades, 
  month 
}: SelectedDayTradesDetailedProps) => {
  if (!selectedDay || trades.length === 0) {
    return null;
  }
  
  // Parse the selected day string (format: "day-month-year")
  const parts = selectedDay.split('-');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0]);
  const monthIndex = parseInt(parts[1]);
  const year = parseInt(parts[2]);
  
  // Format the date for display
  const formattedDate = `${day} ב${month}, ${year}`;
  
  // Calculate total profit/loss
  const totalNetProfit = trades.reduce((sum, trade) => sum + (trade.Net || 0), 0);
  const isPositive = totalNetProfit >= 0;
  
  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex justify-between items-center">
          <div>עסקאות ליום {formattedDate}</div>
          <Badge 
            variant={isPositive ? "outline" : "destructive"} 
            className={`ml-2 ${isPositive ? 'bg-green-50 text-green-700 border-green-200' : ''}`}
          >
            {isPositive ? (
              <ArrowUpRight className="mr-1 h-3 w-3" />
            ) : (
              <ArrowDownRight className="mr-1 h-3 w-3" />
            )}
            {trades.length} עסקאות ({totalNetProfit.toFixed(2)}$)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right px-3 py-2">סמל</th>
                <th className="text-right px-3 py-2">סוג</th>
                <th className="text-right px-3 py-2">כמות</th>
                <th className="text-right px-3 py-2">מחיר כניסה</th>
                <th className="text-right px-3 py-2">מחיר יציאה</th>
                <th className="text-right px-3 py-2">רווח/הפסד</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="px-3 py-2 font-medium">{trade.Symbol || '-'}</td>
                  <td className="px-3 py-2">{trade.Side || '-'}</td>
                  <td className="px-3 py-2">{trade.Qty || '-'}</td>
                  <td className="px-3 py-2">{trade.Price ? `$${trade.Price}` : '-'}</td>
                  <td className="px-3 py-2">{trade.ExitPrice ? `$${trade.ExitPrice}` : '-'}</td>
                  <td className={`px-3 py-2 font-medium ${(trade.Net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trade.Net ? `$${trade.Net.toFixed(2)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SelectedDayTradesDetailed;
