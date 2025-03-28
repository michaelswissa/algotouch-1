
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TradeDay {
  date: string;
  trades: number;
  profit: number;
  status: "Open" | "Active";
}

interface RecentActivitySectionProps {
  tradeDays: TradeDay[];
}

export const RecentActivitySection = ({ tradeDays }: RecentActivitySectionProps) => {
  // Convert date string to formatted display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };
  
  return (
    <div>
      <Card className="glass-card-2025 h-full hover-glow">
        <CardHeader className="pb-2 bg-gradient-to-r from-background to-background/50">
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <span className="neon-text">פעילות אחרונה</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-0">
            <Table>
              <TableBody>
                {tradeDays.map((day, index) => (
                  <TableRow key={index} className="hover:bg-secondary/40 cursor-pointer">
                    <TableCell className="text-right font-medium">
                      {formatDate(day.date)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {day.trades} עסקאות
                    </TableCell>
                    <TableCell className={cn(
                      "text-left font-semibold",
                      day.profit >= 0 ? 'text-tradervue-green' : 'text-tradervue-red'
                    )}>
                      <div className="flex items-center justify-end gap-1">
                        {day.profit >= 0 ? (
                          <>
                            <span>+{day.profit.toFixed(2)}$</span>
                            <ArrowUp size={14} />
                          </>
                        ) : (
                          <>
                            <span>{day.profit.toFixed(2)}$</span>
                            <ArrowDown size={14} />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
