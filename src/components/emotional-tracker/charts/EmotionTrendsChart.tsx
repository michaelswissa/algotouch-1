
import React from 'react';
import { LineChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Mock data for the emotional trends chart
const emotionTrendData = [
  { date: '01/06', confidence: 70, fear: 30, greed: 40, frustration: 20, doubt: 45 },
  { date: '02/06', confidence: 65, fear: 35, greed: 30, frustration: 25, doubt: 50 },
  { date: '03/06', confidence: 60, fear: 45, greed: 35, frustration: 40, doubt: 55 },
  { date: '04/06', confidence: 75, fear: 25, greed: 20, frustration: 15, doubt: 30 },
  { date: '05/06', confidence: 80, fear: 20, greed: 15, frustration: 10, doubt: 25 },
  { date: '06/06', confidence: 65, fear: 40, greed: 30, frustration: 35, doubt: 45 },
  { date: '07/06', confidence: 60, fear: 50, greed: 25, frustration: 45, doubt: 60 },
  { date: '08/06', confidence: 70, fear: 30, greed: 20, frustration: 25, doubt: 35 },
  { date: '09/06', confidence: 85, fear: 15, greed: 10, frustration: 5, doubt: 20 },
  { date: '10/06', confidence: 75, fear: 25, greed: 30, frustration: 20, doubt: 40 },
];

const EmotionTrendsChart: React.FC = () => {
  return (
    <Card className="hover-glow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <LineChartIcon size={18} className="text-primary" />
          מגמות רגשיות לאורך זמן
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={emotionTrendData}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="confidence" stroke="#4ade80" name="ביטחון" />
              <Line type="monotone" dataKey="fear" stroke="#f87171" name="פחד" />
              <Line type="monotone" dataKey="greed" stroke="#fb923c" name="חמדנות" />
              <Line type="monotone" dataKey="frustration" stroke="#a855f7" name="תסכול" />
              <Line type="monotone" dataKey="doubt" stroke="#60a5fa" name="ספק" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmotionTrendsChart;
