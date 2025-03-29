
import React from 'react';
import { PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { emotions } from '../data/emotions';

// Mock data for the emotion distribution chart
const emotionPerformanceData = emotions.map(emotion => ({
  name: emotion.label,
  value: Math.floor(Math.random() * 70) + 10, // Random value between 10-80 for demo
  fill: emotion.id === 'confidence' ? '#4ade80' : 
        emotion.id === 'fear' ? '#f87171' : 
        emotion.id === 'greed' ? '#fb923c' : 
        emotion.id === 'doubt' ? '#60a5fa' : '#a855f7'
}));

const EmotionDistributionChart: React.FC = () => {
  return (
    <Card className="hover-glow rtl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <PieChartIcon size={18} className="text-primary" />
          התפלגות רגשות במסחר
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={emotionPerformanceData}
                nameKey="name"
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmotionDistributionChart;
