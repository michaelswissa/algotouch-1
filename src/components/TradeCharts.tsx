
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TradeRecord, TradeStats } from '@/lib/trade-analysis';
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent 
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface TradeChartsProps {
  trades: TradeRecord[];
  stats: TradeStats;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const PIE_COLORS = {
  Long: '#3b82f6',
  Short: '#ef4444',
  WinLong: '#10b981',
  WinShort: '#10b981',
  LossLong: '#f87171',
  LossShort: '#f87171',
};

const TradeCharts: React.FC<TradeChartsProps> = ({ trades, stats }) => {
  if (!trades.length) return null;

  // Prepare data for equity chart
  const equityData = trades.map((trade, index) => ({
    name: `עסקה ${index + 1}`,
    date: new Date(trade['Entry DateTime']).toLocaleDateString('he-IL'),
    equity: trade.Equity,
  }));

  // Prepare data for profit/loss chart
  const plData = trades.map((trade, index) => ({
    name: `עסקה ${index + 1}`,
    date: new Date(trade['Entry DateTime']).toLocaleDateString('he-IL'),
    profitLoss: trade.ProfitLoss,
    contract: trade.Contract,
  }));

  // Prepare data for side distribution pie chart
  const sideData = [
    { name: 'לונג', value: stats.longTrades },
    { name: 'שורט', value: stats.shortTrades },
  ];

  // Prepare data for win/loss pie chart
  const winLossData = [
    { name: 'רווח לונג', value: stats.profitableLongTrades },
    { name: 'רווח שורט', value: stats.profitableShortTrades },
    { name: 'הפסד לונג', value: stats.longTrades - stats.profitableLongTrades },
    { name: 'הפסד שורט', value: stats.shortTrades - stats.profitableShortTrades },
  ];

  // Filter out any entries with zero value
  const filteredWinLossData = winLossData.filter(item => item.value > 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Over Time Chart */}
        <Card className="glass-card-2025">
          <CardHeader>
            <CardTitle className="text-lg">הון לאורך זמן</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="equity" 
                    name="הון" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Profit/Loss Chart */}
        <Card className="glass-card-2025">
          <CardHeader>
            <CardTitle className="text-lg">רווח/הפסד לכל עסקה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={plData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="profitLoss" 
                    name="רווח/הפסד" 
                    fill="#82ca9d"
                    stroke="#82ca9d"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Side Distribution Pie Chart */}
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
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {sideData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Win/Loss Pie Chart */}
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
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {filteredWinLossData.map((entry, index) => {
                      let color;
                      if (entry.name === 'רווח לונג') color = PIE_COLORS.WinLong;
                      else if (entry.name === 'רווח שורט') color = PIE_COLORS.WinShort;
                      else if (entry.name === 'הפסד לונג') color = PIE_COLORS.LossLong;
                      else if (entry.name === 'הפסד שורט') color = PIE_COLORS.LossShort;
                      else color = COLORS[index % COLORS.length];
                      
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TradeCharts;
