
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import TradeDataTable from '@/components/TradeDataTable';
import { TradeRecord } from '@/lib/trade-analysis';
import { Calendar } from 'lucide-react';

interface SelectedDayTradesProps {
  selectedDay: string | null;
  selectedDayTrades: TradeRecord[];
  month: string;
}

const SelectedDayTrades = ({ selectedDay, selectedDayTrades, month }: SelectedDayTradesProps) => {
  if (!selectedDay) return null;

  const dayNumber = selectedDay.split('-')[0];

  if (selectedDayTrades.length > 0) {
    return (
      <Card className="mt-4 animate-in slide-in-from-top-4 duration-300 border-primary/20">
        <CardContent className="pt-4">
          <h4 className="text-lg font-medium mb-4 flex items-center gap-2 border-b pb-2">
            <Calendar size={18} className="text-primary" />
            <span>עסקאות ליום</span>
            <span className="px-1 bg-primary/10 rounded text-primary">{dayNumber}</span>
            <span>{month}</span>
            <span className="text-sm text-muted-foreground mr-2">({selectedDayTrades.length} עסקאות)</span>
          </h4>
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
