
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
    date: '20 Jun 2024',
    pnl: 781.52,
    volume: 123,
    executions: 12,
    exitEfficiency: 60,
    side: 'Long',
    tags: ['Options', 'Smith', '+2'],
    notes: 'The set-up: What I did...',
  },
  {
    id: '2',
    symbol: 'VERO',
    date: '07 Jun 2024',
    pnl: -246.90,
    volume: 41,
    executions: 1423,
    exitEfficiency: 10,
    side: 'Long',
    tags: ['LogoPro', 'Healthcare'],
    notes: 'The set-up: What I did...',
  },
  {
    id: '3',
    symbol: 'HOLO',
    date: '05 Jun 2024',
    pnl: 808.01,
    volume: 1420,
    executions: 235,
    exitEfficiency: 43,
    side: 'Long',
    tags: ['Options', 'Healthcare'],
    notes: 'The set-up: What I did...',
  },
  {
    id: '4',
    symbol: 'LSDI',
    date: '31 May 2024',
    pnl: 18.50,
    volume: 1,
    executions: 8,
    exitEfficiency: 98,
    side: 'Long',
    tags: ['Options', 'Healthcare', '+2'],
    notes: 'The set-up: What I did...',
  },
];

const TradeList = () => {
  return (
    <div>
      <div className="flex gap-4 mb-4 overflow-x-auto">
        <button className="tradervue-tab active">Table</button>
        <button className="tradervue-tab">Charts (large)</button>
        <button className="tradervue-tab">Charts (short)</button>
        <div className="flex-1"></div>
        <button className="tradervue-tab active">Gross</button>
        <button className="tradervue-tab">Net</button>
      </div>

      <Table className="tradervue-table">
        <TableHeader>
          <TableRow>
            <TableCell className="w-10">
              <input type="checkbox" className="rounded border-gray-300" />
            </TableCell>
            <TableCell>Symbol</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>P&L</TableCell>
            <TableCell>Volume</TableCell>
            <TableCell>Execs</TableCell>
            <TableCell>Exit eff.</TableCell>
            <TableCell>Side</TableCell>
            <TableCell>Tags</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockTrades.map((trade) => (
            <TableRow key={trade.id}>
              <TableCell>
                <input type="checkbox" className="rounded border-gray-300" />
              </TableCell>
              <TableCell className="font-medium">{trade.symbol}</TableCell>
              <TableCell>{trade.date}</TableCell>
              <TableCell className={cn(
                trade.pnl >= 0 ? 'text-tradervue-green' : 'text-tradervue-red',
                'font-medium'
              )}>
                {trade.pnl >= 0 ? `$${trade.pnl}` : `-$${Math.abs(trade.pnl)}`}
              </TableCell>
              <TableCell>{trade.volume}</TableCell>
              <TableCell>{trade.executions}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {trade.exitEfficiency}%
                  <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
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
                  "bg-blue-50 text-blue-600 hover:bg-blue-50",
                  "border-blue-200"
                )}>
                  {trade.side}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {trade.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-gray-50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-gray-500 truncate max-w-[160px]">
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
