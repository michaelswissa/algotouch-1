
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TradeRecord } from '@/lib/trade-analysis';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

interface TradeDataTableProps {
  trades: TradeRecord[];
}

const TradeDataTable: React.FC<TradeDataTableProps> = ({ trades }) => {
  // Format date string for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (!trades.length) return null;

  return (
    <div className="overflow-x-auto" dir="rtl">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/40 bg-secondary/20">
            <TableHead className="text-right">קונטרקט</TableHead>
            <TableHead className="text-right">סיגנל</TableHead>
            <TableHead className="text-right">כיוון</TableHead>
            <TableHead className="text-right">כניסה</TableHead>
            <TableHead className="text-right">יציאה</TableHead>
            <TableHead className="text-right">מחיר כניסה</TableHead>
            <TableHead className="text-right">מחיר יציאה</TableHead>
            <TableHead className="text-right">רווח/הפסד</TableHead>
            <TableHead className="text-right">נטו</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade, index) => (
            <TableRow key={index} className="hover:bg-secondary/10">
              <TableCell className="font-medium text-right">{trade.Contract}</TableCell>
              <TableCell className="text-right">{trade['Signal Name']}</TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className={cn(
                  trade.Side === 'Long' 
                    ? "bg-blue-900/30 text-blue-300 hover:bg-blue-900/40 border-blue-800/50" 
                    : "bg-red-900/30 text-red-300 hover:bg-red-900/40 border-red-800/50"
                )}>
                  {trade.Side === 'Long' ? 'לונג' : 'שורט'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatDate(trade['Entry DateTime'])}</TableCell>
              <TableCell className="text-right">{formatDate(trade['Exit DateTime'])}</TableCell>
              <TableCell className="text-right">{trade.EntryPrice}</TableCell>
              <TableCell className="text-right">{trade.ExitPrice}</TableCell>
              <TableCell className={cn(
                "font-medium text-right",
                trade.ProfitLoss >= 0 ? "text-tradervue-green" : "text-tradervue-red"
              )}>
                {trade.ProfitLoss >= 0 ? `₪${trade.ProfitLoss.toFixed(2)}` : `-₪${Math.abs(trade.ProfitLoss).toFixed(2)}`}
              </TableCell>
              <TableCell className={cn(
                "font-medium text-right",
                trade.Net >= 0 ? "text-tradervue-green" : "text-tradervue-red"
              )}>
                {trade.Net >= 0 ? `₪${trade.Net.toFixed(2)}` : `-₪${Math.abs(trade.Net).toFixed(2)}`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TradeDataTable;
