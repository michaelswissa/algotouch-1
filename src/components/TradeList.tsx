
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Smile, Frown, Meh, HelpCircle, Info } from 'lucide-react';
import { emotions } from '@/components/emotional-tracker/data/emotions';
import { useTradingDataStore } from '@/stores/trading-data-store';

interface EmotionRecord {
  id: string;
  label: string;
}

const emotionIconMap: Record<string, JSX.Element> = {
  confidence: <Smile className="text-green-500" />,
  doubt: <HelpCircle className="text-blue-500" />,
  fear: <Frown className="text-red-500" />,
  greed: <Meh className="text-orange-500" />,
  frustration: <Frown className="text-purple-500" />,
  undefined: <Info className="text-gray-400" />
};

const getEmotionLabel = (emotionId: string | undefined): string => {
  if (!emotionId) return 'לא צוין';
  const emotion = emotions.find(e => e.id === emotionId);
  return emotion ? emotion.label : 'לא צוין';
};

const TradeList = () => {
  // Use real data from the store instead of mock data
  const { globalTrades } = useTradingDataStore();
  
  // If no trades, show empty state
  if (globalTrades.length === 0) {
    return (
      <div dir="rtl" className="p-8 text-center">
        <p className="text-muted-foreground">לא נמצאו עסקאות. נא להעלות קובץ עסקאות.</p>
      </div>
    );
  }
  
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

      <div className="overflow-x-auto">
        <Table className="tradervue-table w-full">
          <TableHeader>
            <TableRow className="border-b border-border/40 bg-secondary/20">
              <TableCell className="w-10 text-right">
                <input type="checkbox" className="rounded border-border" />
              </TableCell>
              <TableCell className="text-right">סמל</TableCell>
              <TableCell className="text-right">תאריך</TableCell>
              <TableCell className="text-right">רווח/הפסד</TableCell>
              <TableCell className="text-right">נפח</TableCell>
              <TableCell className="text-right">מחיר כניסה</TableCell>
              <TableCell className="text-right">מחיר יציאה</TableCell>
              <TableCell className="text-right">כיוון</TableCell>
              <TableCell className="text-right">הערות</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {globalTrades.slice(0, 10).map((trade, index) => (
              <TableRow key={index} className="hover:bg-secondary/10 transition-colors">
                <TableCell className="text-right">
                  <input type="checkbox" className="rounded border-border" />
                </TableCell>
                <TableCell className="font-medium text-right">{trade.Contract}</TableCell>
                <TableCell className="text-right">
                  {new Date(trade['Entry DateTime']).toLocaleDateString('he-IL')}
                </TableCell>
                <TableCell className={cn(
                  trade.Net >= 0 ? 'text-tradervue-green' : 'text-tradervue-red',
                  'font-medium text-right'
                )}>
                  {trade.Net >= 0 ? `$${trade.Net?.toFixed(2)}` : `-$${Math.abs(trade.Net).toFixed(2)}`}
                </TableCell>
                <TableCell className="text-right">1</TableCell>
                <TableCell className="text-right">${trade.EntryPrice?.toFixed(2)}</TableCell>
                <TableCell className="text-right">${trade.ExitPrice?.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={cn(
                    "bg-blue-900/30 text-blue-300 hover:bg-blue-900/40",
                    "border-blue-800/50"
                  )}>
                    {trade.Side === 'Long' ? 'לונג' : 'שורט'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[160px] text-right">
                  {trade['Signal Name'] || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TradeList;
