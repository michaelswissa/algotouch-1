
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

// Mock data for the trade outcome chart
const tradeOutcomeData = [
  { name: 'ביטחון', profit: 75, loss: 25 },
  { name: 'פחד', profit: 40, loss: 60 },
  { name: 'חמדנות', profit: 30, loss: 70 },
  { name: 'תסכול', profit: 25, loss: 75 },
  { name: 'ספק', profit: 45, loss: 55 },
];

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
