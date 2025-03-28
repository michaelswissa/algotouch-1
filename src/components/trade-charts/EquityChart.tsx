
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { tooltipStyle } from './utils';
import { TradeRecord } from '@/lib/trade-analysis';

interface EquityChartProps {
  trades: TradeRecord[];
}

const EquityChart: React.FC<EquityChartProps> = ({ trades }) => {
  // Prepare data for equity chart
  const equityData = trades.map((trade, index) => ({
    name: `עסקה ${index + 1}`,
    date: new Date(trade['Entry DateTime']).toLocaleDateString('he-IL'),
    equity: trade.Equity,
  }));

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle className="text-lg">הון לאורך זמן</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equityData}>
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
                formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, 'הון']}
                labelFormatter={(label) => `תאריך: ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ fontSize: '14px', fontWeight: 500 }}
              />
              <Line 
                type="monotone" 
                dataKey="equity" 
                name="הון" 
                stroke="#8884d8" 
                strokeWidth={2}
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquityChart;
