
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { tooltipStyle, prepareContractData } from './utils';
import { TradeRecord } from '@/lib/trade-analysis';

interface ContractPerformanceChartProps {
  trades: TradeRecord[];
}

const ContractPerformanceChart: React.FC<ContractPerformanceChartProps> = ({ trades }) => {
  const contractData = prepareContractData(trades);

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle className="text-lg">ביצועים לפי חוזה</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={contractData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12, fill: '#666' }}
                stroke="#666"
                tickFormatter={(value) => `₪${value.toLocaleString()}`}
              />
              <YAxis 
                dataKey="contract" 
                type="category" 
                tick={{ fontSize: 14, fill: '#333', fontWeight: 500 }}
                width={80}
                stroke="#666"
              />
              <Tooltip 
                contentStyle={tooltipStyle}
                formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, 'רווח/הפסד']}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ fontSize: '14px', fontWeight: 500 }}
              />
              <Bar 
                dataKey="pnl" 
                name="רווח/הפסד" 
                fill="#82ca9d"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractPerformanceChart;
