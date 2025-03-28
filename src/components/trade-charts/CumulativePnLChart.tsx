
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { tooltipStyle } from './utils';
import { TradeStats } from '@/lib/trade-analysis';

interface CumulativePnLChartProps {
  stats: TradeStats;
}

const CumulativePnLChart: React.FC<CumulativePnLChartProps> = ({ stats }) => {
  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle className="text-lg">רווח/הפסד מצטבר</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.cumulativePnL}>
              <defs>
                <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#666' }}
                stroke="#666"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#666' }}
                stroke="#666"
                tickFormatter={(value) => `₪${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={tooltipStyle}
                formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, 'רווח/הפסד מצטבר']}
                labelFormatter={(label) => `תאריך: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="pnl" 
                name="רווח/הפסד מצטבר" 
                stroke="#8884d8"
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPnL)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CumulativePnLChart;
