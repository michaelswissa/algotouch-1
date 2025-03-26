
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

interface Trade {
  id: string;
  symbol: string;
  date: string;
  pnl: number;
  volume: number;
  executions: number;
  exitEfficiency: number;
  side: 'Long' | 'Short';
  tags: string[];
  notes: string;
}

const mockTrades: Trade[] = [
  {
    id: '1',
    symbol: 'MGOGL',
    date: '20 יוני 2024',
    pnl: 781.52,
    volume: 123,
    executions: 12,
    exitEfficiency: 60,
    side: 'Long',
    tags: ['אופציות', 'סמית\'', '+2'],
    notes: 'הסט-אפ: מה שעשיתי...',
  },
  {
    id: '2',
    symbol: 'VERO',
    date: '07 יוני 2024',
    pnl: -246.90,
    volume: 41,
    executions: 1423,
    exitEfficiency: 10,
    side: 'Long',
    tags: ['לוגופרו', 'בריאות'],
    notes: 'הסט-אפ: מה שעשיתי...',
  },
  {
    id: '3',
    symbol: 'HOLO',
    date: '05 יוני 2024',
    pnl: 808.01,
    volume: 1420,
    executions: 235,
    exitEfficiency: 43,
    side: 'Long',
    tags: ['אופציות', 'בריאות'],
    notes: 'הסט-אפ: מה שעשיתי...',
  },
  {
    id: '4',
    symbol: 'LSDI',
    date: '31 מאי 2024',
    pnl: 18.50,
    volume: 1,
    executions: 8,
    exitEfficiency: 98,
    side: 'Long',
    tags: ['אופציות', 'בריאות', '+2'],
    notes: 'הסט-אפ: מה שעשיתי...',
  },
];

const TradeList = () => {
  return (
    <div dir="rtl">
      <div className="flex gap-4 mb-4 overflow-x-auto">
        <button className="tradervue-tab active">טבלה</button>
        <button className="tradervue-tab">גרפים (גדולים)</button>
        <button className="tradervue-tab">גרפים (קטנים)</button>
        <div className="flex-1"></div>
        <button className="tradervue-tab active">ברוטו</button>
        <button className="tradervue-tab">נטו</button>
      </div>

      <Table className="tradervue-table">
        <TableHeader>
          <TableRow className="border-b border-border/40 bg-secondary/20">
            <TableCell className="w-10">
              <input type="checkbox" className="rounded border-border" />
            </TableCell>
            <TableCell>סמל</TableCell>
            <TableCell>תאריך</TableCell>
            <TableCell>רווח/הפסד</TableCell>
            <TableCell>נפח</TableCell>
            <TableCell>פעולות</TableCell>
            <TableCell>יעילות יציאה</TableCell>
            <TableCell>כיוון</TableCell>
            <TableCell>תגיות</TableCell>
            <TableCell>הערות</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockTrades.map((trade) => (
            <TableRow key={trade.id} className="hover:bg-secondary/10 transition-colors">
              <TableCell>
                <input type="checkbox" className="rounded border-border" />
              </TableCell>
              <TableCell className="font-medium">{trade.symbol}</TableCell>
              <TableCell>{trade.date}</TableCell>
              <TableCell className={cn(
                trade.pnl >= 0 ? 'text-tradervue-green' : 'text-tradervue-red',
                'font-medium'
              )}>
                {trade.pnl >= 0 ? `₪${trade.pnl}` : `-₪${Math.abs(trade.pnl)}`}
              </TableCell>
              <TableCell>{trade.volume}</TableCell>
              <TableCell>{trade.executions}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {trade.exitEfficiency}%
                  <div className="w-12 h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full", 
                        trade.exitEfficiency > 50 ? "bg-tradervue-green" : "bg-tradervue-red"
                      )}
                      style={{ width: `${trade.exitEfficiency}%` }}
                    ></div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn(
                  "bg-blue-900/30 text-blue-300 hover:bg-blue-900/40",
                  "border-blue-800/50"
                )}>
                  {trade.side === 'Long' ? 'לונג' : 'שורט'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {trade.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-secondary/30 border-border/50 text-muted-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground truncate max-w-[160px]">
                {trade.notes}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TradeList;
