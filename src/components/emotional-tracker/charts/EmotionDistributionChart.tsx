
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

// Mock data for the emotion distribution chart
const emotionPerformanceData = [
  { name: 'ביטחון', value: 78, fill: '#4ade80' },
  { name: 'פחד', value: 32, fill: '#f87171' },
  { name: 'חמדנות', value: 45, fill: '#fb923c' },
  { name: 'תסכול', value: 28, fill: '#a855f7' },
  { name: 'ספק', value: 52, fill: '#60a5fa' },
];

const EmotionDistributionChart: React.FC = () => {
  return (
    <Card className="hover-glow">
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
