
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TradeRecord } from '@/lib/trade-analysis';
import { ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TradeDataTableProps {
  trades: TradeRecord[];
}

const TradeDataTable = ({ trades }: TradeDataTableProps) => {
  if (!trades.length) return null;
  
  const formatTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr);
      return format(date, 'HH:mm');
    } catch (e) {
      return dateTimeStr;
    }
  };

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">חוזה</TableHead>
            <TableHead className="text-right">כיוון</TableHead>
            <TableHead className="text-right">שעת כניסה</TableHead>
            <TableHead className="text-right">שעת יציאה</TableHead>
            <TableHead className="text-right">מחיר כניסה</TableHead>
            <TableHead className="text-right">מחיר יציאה</TableHead>
            <TableHead className="text-right">רווח/הפסד</TableHead>
            <TableHead className="text-right">נטו</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{trade.Contract}</TableCell>
              <TableCell>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs",
                  trade.Side === 'Long' 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                )}>
                  {trade.Side === 'Long' ? 'Long' : 'Short'}
                </span>
              </TableCell>
              <TableCell className="flex items-center gap-1">
                <Clock size={14} className="text-muted-foreground" />
                {formatTime(trade['Entry DateTime'])}
              </TableCell>
              <TableCell className="flex items-center gap-1">
                <Clock size={14} className="text-muted-foreground" />
                {formatTime(trade['Exit DateTime'])}
              </TableCell>
              <TableCell>{trade.EntryPrice}</TableCell>
              <TableCell>{trade.ExitPrice}</TableCell>
              <TableCell 
                className={trade.ProfitLoss > 0 ? "text-green-600" : "text-red-600"}
              >
                {trade.ProfitLoss > 0 ? (
                  <span className="flex items-center">
                    <ArrowUp size={14} />
                    {trade.ProfitLoss.toFixed(2)}₪
                  </span>
                ) : (
                  <span className="flex items-center">
                    <ArrowDown size={14} />
                    {Math.abs(trade.ProfitLoss).toFixed(2)}₪
                  </span>
                )}
              </TableCell>
              <TableCell 
                className={trade.Net > 0 ? "text-green-600" : "text-red-600"}
              >
                {trade.Net > 0 ? (
                  <span className="flex items-center">
                    <ArrowUp size={14} />
                    {trade.Net.toFixed(2)}₪
                  </span>
                ) : (
                  <span className="flex items-center">
                    <ArrowDown size={14} />
                    {Math.abs(trade.Net).toFixed(2)}₪
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TradeDataTable;
