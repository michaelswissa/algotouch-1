
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { tooltipStyle } from './utils';
import { TradeRecord } from '@/lib/trade-analysis';

interface ProfitLossChartProps {
  trades: TradeRecord[];
}

const ProfitLossChart: React.FC<ProfitLossChartProps> = ({ trades }) => {
  // Prepare data for profit/loss chart
  const plData = trades.map((trade, index) => ({
    name: `עסקה ${index + 1}`,
    date: new Date(trade['Entry DateTime']).toLocaleDateString('he-IL'),
    profitLoss: trade.ProfitLoss,
    contract: trade.Contract,
  }));

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle className="text-lg">רווח/הפסד לכל עסקה</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={plData}>
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
                formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, 'רווח/הפסד']}
                labelFormatter={(label) => `תאריך: ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ fontSize: '14px', fontWeight: 500 }}
              />
              <Bar 
                dataKey="profitLoss" 
                name="רווח/הפסד" 
                fill="#82ca9d"
                stroke="#82ca9d"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitLossChart;
