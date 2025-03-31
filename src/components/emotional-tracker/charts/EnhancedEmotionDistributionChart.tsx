
import React from 'react';
import { PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { enhancedEmotions } from '../data/enhanced-emotions';

// Define the data structure for emotion distribution
interface EmotionDistributionData {
  name: string;
  value: number;
  fill: string;
  category: 'positive' | 'negative' | 'neutral';
}

// Mock data for the emotion distribution chart
const generateEmotionDistributionData = (): EmotionDistributionData[] => {
  return enhancedEmotions.map(emotion => ({
    name: emotion.label,
    value: Math.floor(Math.random() * 70) + 10, // Random value between 10-80 for demo
    fill: emotion.id === 'confidence' ? '#4ade80' : 
          emotion.id === 'fear' ? '#f87171' : 
          emotion.id === 'greed' ? '#fb923c' : 
          emotion.id === 'doubt' ? '#60a5fa' : 
          emotion.id === 'frustration' ? '#a855f7' :
          emotion.id === 'satisfaction' ? '#10b981' :
          emotion.id === 'impatience' ? '#f59e0b' :
          emotion.id === 'patience' ? '#14b8a6' :
          emotion.id === 'anxiety' ? '#f43f5e' :
          emotion.id === 'calmness' ? '#0ea5e9' :
          emotion.id === 'overconfidence' ? '#84cc16' : '#8b5cf6',
    category: emotion.category
  }));
};

interface EnhancedEmotionDistributionChartProps {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  showCategories?: boolean;
}

const EnhancedEmotionDistributionChart: React.FC<EnhancedEmotionDistributionChartProps> = ({ 
  timeRange = 'month',
  showCategories = true
}) => {
  // Generate data based on time range
  const emotionDistributionData = generateEmotionDistributionData();
  
  // Filter or process data based on time range if needed
  // This would connect to real data in a production environment
  
  // Group data by category if showCategories is true
  const groupedData = showCategories 
    ? [
        {
          name: 'חיוביים',
          value: emotionDistributionData
            .filter(item => item.category === 'positive')
            .reduce((sum, item) => sum + item.value, 0),
          fill: '#4ade80',
          category: 'positive' as const
        },
        {
          name: 'ניטרליים',
          value: emotionDistributionData
            .filter(item => item.category === 'neutral')
            .reduce((sum, item) => sum + item.value, 0),
          fill: '#60a5fa',
          category: 'neutral' as const
        },
        {
          name: 'שליליים',
          value: emotionDistributionData
            .filter(item => item.category === 'negative')
            .reduce((sum, item) => sum + item.value, 0),
          fill: '#f87171',
          category: 'negative' as const
        }
      ]
    : emotionDistributionData;
  
  // Calculate total for percentage display
  const total = groupedData.reduce((sum, item) => sum + item.value, 0);
  
  // Custom tooltip to show percentages
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 rounded shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">
            <span className="font-medium">{data.value}</span> ({percentage}%)
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  // Get time range display text
  const getTimeRangeText = () => {
    switch (timeRange) {
      case 'week': return 'בשבוע האחרון';
      case 'month': return 'בחודש האחרון';
      case 'quarter': return 'ברבעון האחרון';
      case 'year': return 'בשנה האחרונה';
      default: return 'בחודש האחרון';
    }
  };

  return (
    <Card className="hover-glow rtl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <PieChartIcon size={18} className="text-primary" />
          התפלגות רגשות במסחר {getTimeRangeText()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={groupedData}
                nameKey="name"
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                isAnimationActive={true}
                animationDuration={800}
              >
                {groupedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Additional statistics */}
        <div className="grid grid-cols-3 gap-4 mt-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">רגש דומיננטי</p>
            <p className="font-medium">
              {emotionDistributionData.sort((a, b) => b.value - a.value)[0].name}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">יחס חיובי/שלילי</p>
            <p className="font-medium">
              {(() => {
                const positive = emotionDistributionData
                  .filter(item => item.category === 'positive')
                  .reduce((sum, item) => sum + item.value, 0);
                const negative = emotionDistributionData
                  .filter(item => item.category === 'negative')
                  .reduce((sum, item) => sum + item.value, 0);
                
                if (negative === 0) return 'אינסוף';
                return (positive / negative).toFixed(1);
              })()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">מגוון רגשי</p>
            <p className="font-medium">
              {emotionDistributionData.filter(item => item.value > 5).length} / {emotionDistributionData.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedEmotionDistributionChart;
