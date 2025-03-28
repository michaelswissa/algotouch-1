
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TradeRecord, TradeStats } from '@/lib/trade-analysis';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent 
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

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
  const [activeChart, setActiveChart] = useState('basic');
  
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
    { name: 'לונג', value: stats.longTrades, label: `לונג: ${stats.longTrades}` },
    { name: 'שורט', value: stats.shortTrades, label: `שורט: ${stats.shortTrades}` },
  ];

  // Prepare data for win/loss pie chart
  const winLossData = [
    { name: 'רווח לונג', value: stats.profitableLongTrades, label: `רווח לונג: ${stats.profitableLongTrades}` },
    { name: 'רווח שורט', value: stats.profitableShortTrades, label: `רווח שורט: ${stats.profitableShortTrades}` },
    { name: 'הפסד לונג', value: stats.longTrades - stats.profitableLongTrades, label: `הפסד לונג: ${stats.longTrades - stats.profitableLongTrades}` },
    { name: 'הפסד שורט', value: stats.shortTrades - stats.profitableShortTrades, label: `הפסד שורט: ${stats.shortTrades - stats.profitableShortTrades}` },
  ];

  // Filter out any entries with zero value
  const filteredWinLossData = winLossData.filter(item => item.value > 0);
  
  // Contract performance data
  const contractPerformance = trades.reduce((acc: Record<string, number>, trade) => {
    if (!acc[trade.Contract]) {
      acc[trade.Contract] = 0;
    }
    acc[trade.Contract] += trade.ProfitLoss;
    return acc;
  }, {});
  
  const contractData = Object.entries(contractPerformance).map(([contract, pnl]) => ({
    contract,
    pnl
  }));

  // Custom pie chart label renderer with better visibility
  const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="#333333" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="500"
        className="dark:fill-white"
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip formatter for better readability
  const customTooltipFormatter = (value: number, name: string) => {
    return [`${value.toFixed(2)}`, name];
  };
  
  // Enhanced tooltip styles
  const tooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #ccc',
    padding: '10px',
    borderRadius: '5px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
    fontSize: '14px',
    fontWeight: 500,
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Tabs value={activeChart} onValueChange={setActiveChart}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">גרפים בסיסיים</TabsTrigger>
          <TabsTrigger value="advanced">ניתוח מתקדם</TabsTrigger>
          <TabsTrigger value="distribution">התפלגויות</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-6">
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

            {/* Profit/Loss Chart */}
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
          </div>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cumulative P&L Chart */}
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
            
            {/* Contract Performance */}
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
          </div>
        </TabsContent>
        
        <TabsContent value="distribution" className="space-y-6">
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
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={renderCustomizedPieLabel}
                        labelFormatter={(value: any) => value.toLocaleString()}
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
          </div>
          
          {/* Trade Frequency */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradeCharts;
