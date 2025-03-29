
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
} from 'recharts';
import { emotions } from '../data/emotions';

// Mock data for the trade outcome chart, now using the emotions from the shared data file
const tradeOutcomeData = emotions.map(emotion => ({
  name: emotion.label,
  profit: emotion.id === 'confidence' ? 75 : 
          emotion.id === 'fear' ? 40 : 
          emotion.id === 'greed' ? 30 : 
          emotion.id === 'doubt' ? 45 : 25,
  loss: emotion.id === 'confidence' ? 25 : 
         emotion.id === 'fear' ? 60 : 
         emotion.id === 'greed' ? 70 : 
         emotion.id === 'doubt' ? 55 : 75,
}));

const EmotionOutcomeChart: React.FC = () => {
  return (
    <Card className="hover-glow col-span-1 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChartIcon size={18} className="text-primary" />
          השפעת רגשות על תוצאות המסחר
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tradeOutcomeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="profit" stackId="a" fill="#4ade80" name="רווח %" />
              <Bar dataKey="loss" stackId="a" fill="#f87171" name="הפסד %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-muted-foreground text-center mt-4">
          הגרף מציג את אחוז העסקאות הרווחיות/מפסידות בהתבסס על הרגש הדומיננטי בזמן הכניסה לעסקה
        </p>
      </CardContent>
    </Card>
  );
};

export default EmotionOutcomeChart;
