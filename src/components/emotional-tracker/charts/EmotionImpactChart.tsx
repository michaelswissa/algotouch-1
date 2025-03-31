
import React from 'react';
import { BarChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Define the data structure for emotion impact on trading
interface EmotionImpactData {
  emotion: string;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  fill: string;
}

// Generate mock data for emotion impact
const generateEmotionImpactData = (): EmotionImpactData[] => {
  return [
    {
      emotion: 'ביטחון',
      winRate: 65,
      profitFactor: 2.1,
      avgWin: 320,
      avgLoss: 180,
      totalTrades: 48,
      fill: '#4ade80'
    },
    {
      emotion: 'פחד',
      winRate: 45,
      profitFactor: 0.8,
      avgWin: 210,
      avgLoss: 250,
      totalTrades: 22,
      fill: '#f87171'
    },
    {
      emotion: 'תסכול',
      winRate: 40,
      profitFactor: 0.7,
      avgWin: 180,
      avgLoss: 260,
      totalTrades: 34,
      fill: '#a855f7'
    },
    {
      emotion: 'סיפוק',
      winRate: 70,
      profitFactor: 2.4,
      avgWin: 350,
      avgLoss: 170,
      totalTrades: 14,
      fill: '#10b981'
    },
    {
      emotion: 'חרדה',
      winRate: 35,
      profitFactor: 0.6,
      avgWin: 150,
      avgLoss: 240,
      totalTrades: 28,
      fill: '#f43f5e'
    }
  ];
};

interface EmotionImpactChartProps {
  metric?: 'winRate' | 'profitFactor' | 'avgWin' | 'avgLoss';
  sortBy?: 'emotion' | 'performance' | 'totalTrades';
}

const EmotionImpactChart: React.FC<EmotionImpactChartProps> = ({
  metric = 'winRate',
  sortBy = 'performance'
}) => {
  // Generate data
  const impactData = generateEmotionImpactData();
  
  // Sort data based on sortBy parameter
  const sortedData = [...impactData].sort((a, b) => {
    if (sortBy === 'emotion') return a.emotion.localeCompare(b.emotion);
    if (sortBy === 'totalTrades') return b.totalTrades - a.totalTrades;
    // Default: sort by performance (the selected metric)
    return b[metric] - a[metric];
  });
  
  // Get metric display name
  const getMetricDisplayName = (): string => {
    switch (metric) {
      case 'winRate': return 'אחוז הצלחה';
      case 'profitFactor': return 'מכפיל רווח';
      case 'avgWin': return 'רווח ממוצע';
      case 'avgLoss': return 'הפסד ממוצע';
      default: return 'אחוז הצלחה';
    }
  };
  
  // Format value based on metric
  const formatValue = (value: number): string => {
    switch (metric) {
      case 'winRate': return `${value}%`;
      case 'profitFactor': return value.toFixed(1);
      case 'avgWin':
      case 'avgLoss':
        return `₪${value}`;
      default: return `${value}`;
    }
  };
  
  // Define YAxis domain based on metric
  const getYAxisDomain = () => {
    if (metric === 'winRate') {
      return [0, 100] as [number, number];
    }
    return undefined; // Auto calculate domain for other metrics
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded shadow-md">
          <p className="font-medium">{data.emotion}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <p className="text-sm">
              <span className="text-muted-foreground">אחוז הצלחה:</span> {data.winRate}%
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">מכפיל רווח:</span> {data.profitFactor.toFixed(1)}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">רווח ממוצע:</span> ₪{data.avgWin}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">הפסד ממוצע:</span> ₪{data.avgLoss}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">סה"כ עסקאות:</span> {data.totalTrades}
            </p>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card className="hover-glow rtl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChartIcon size={18} className="text-primary" />
          השפעת רגשות על תוצאות המסחר
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="emotion" />
              <YAxis 
                domain={getYAxisDomain()}
                tickFormatter={(value) => formatValue(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey={metric} 
                name={getMetricDisplayName()}
                isAnimationActive={true}
                animationDuration={800}
              >
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Insights section */}
        <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
          <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-1">תובנות ביצועים</h3>
          <p className="text-sm text-indigo-700 dark:text-indigo-400">
            {(() => {
              // Find best and worst performing emotions
              const bestEmotion = sortedData.reduce((best, current) => 
                current[metric] > best[metric] ? current : best, sortedData[0]);
              
              const worstEmotion = sortedData.reduce((worst, current) => 
                current[metric] < worst[metric] ? current : worst, sortedData[0]);
              
              if (metric === 'winRate' || metric === 'profitFactor' || metric === 'avgWin') {
                return `הביצועים הטובים ביותר הם כאשר אתה מרגיש ${bestEmotion.emotion} (${formatValue(bestEmotion[metric])}), והגרועים ביותר כאשר אתה מרגיש ${worstEmotion.emotion} (${formatValue(worstEmotion[metric])}).`;
              } else {
                return `ההפסדים הנמוכים ביותר הם כאשר אתה מרגיש ${worstEmotion.emotion} (${formatValue(worstEmotion[metric])}), והגבוהים ביותר כאשר אתה מרגיש ${bestEmotion.emotion} (${formatValue(bestEmotion[metric])}).`;
              }
            })()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmotionImpactChart;
