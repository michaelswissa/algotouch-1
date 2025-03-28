
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { tooltipStyle, customTooltipFormatter, renderCustomizedPieLabel, COLORS, PIE_COLORS } from './utils';
import { TradeStats } from '@/lib/trade-analysis';

interface DistributionChartsProps {
  stats: TradeStats;
}

export const SideDistributionChart: React.FC<DistributionChartsProps> = ({ stats }) => {
  // Prepare data for side distribution pie chart
  const sideData = [
    { name: 'לונג', value: stats.longTrades, label: `לונג: ${stats.longTrades}` },
    { name: 'שורט', value: stats.shortTrades, label: `שורט: ${stats.shortTrades}` },
  ];

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle className="text-lg">התפלגות כיווני עסקאות</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sideData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={renderCustomizedPieLabel}
              >
                {sideData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={tooltipStyle}
                formatter={customTooltipFormatter}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const WinLossDistributionChart: React.FC<DistributionChartsProps> = ({ stats }) => {
  // Prepare data for win/loss pie chart
  const winLossData = [
    { name: 'רווח לונג', value: stats.profitableLongTrades, label: `רווח לונג: ${stats.profitableLongTrades}` },
    { name: 'רווח שורט', value: stats.profitableShortTrades, label: `רווח שורט: ${stats.profitableShortTrades}` },
    { name: 'הפסד לונג', value: stats.longTrades - stats.profitableLongTrades, label: `הפסד לונג: ${stats.longTrades - stats.profitableLongTrades}` },
    { name: 'הפסד שורט', value: stats.shortTrades - stats.profitableShortTrades, label: `הפסד שורט: ${stats.shortTrades - stats.profitableShortTrades}` },
  ];

  // Filter out any entries with zero value
  const filteredWinLossData = winLossData.filter(item => item.value > 0);

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle className="text-lg">התפלגות רווח/הפסד לפי כיוון</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filteredWinLossData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={renderCustomizedPieLabel}
              >
                {filteredWinLossData.map((entry, index) => {
                  let color;
                  if (entry.name === 'רווח לונג') color = PIE_COLORS.WinLong;
                  else if (entry.name === 'רווח שורט') color = PIE_COLORS.WinShort;
                  else if (entry.name === 'הפסד לונג') color = PIE_COLORS.LossLong;
                  else if (entry.name === 'הפסד שורט') color = PIE_COLORS.LossShort;
                  else color = COLORS[index % COLORS.length];
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={color} 
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                })}
              </Pie>
              <Tooltip 
                contentStyle={tooltipStyle}
                formatter={customTooltipFormatter}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const TradeFrequencyChart: React.FC<DistributionChartsProps> = ({ stats }) => {
  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle className="text-lg">תדירות מסחר לפי תאריך</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.tradeFrequency}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#666' }}
                stroke="#666"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#666' }}
                stroke="#666"
                tickFormatter={(value) => value.toString()}
              />
              <Tooltip 
                contentStyle={tooltipStyle}
                formatter={(value: any) => [value, 'מספר עסקאות']}
                labelFormatter={(label) => `תאריך: ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ fontSize: '14px', fontWeight: 500 }}
              />
              <Bar 
                dataKey="count" 
                name="מספר עסקאות" 
                fill="#8884d8"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const DistributionCharts: React.FC<DistributionChartsProps> = ({ stats }) => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SideDistributionChart stats={stats} />
        <WinLossDistributionChart stats={stats} />
      </div>
      <TradeFrequencyChart stats={stats} />
    </>
  );
};

export default DistributionCharts;
