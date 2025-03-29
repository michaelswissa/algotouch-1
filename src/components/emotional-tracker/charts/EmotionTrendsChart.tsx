
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
import { emotions } from '../data/emotions';

// Mock data for the emotional trends chart
const generateEmotionTrendData = () => {
  const dates = ['01/06', '02/06', '03/06', '04/06', '05/06', '06/06', '07/06', '08/06', '09/06', '10/06'];
  
  return dates.map(date => {
    const dataPoint: any = { date };
    
    emotions.forEach(emotion => {
      // Generate a somewhat realistic pattern rather than completely random numbers
      const baseValue = emotion.id === 'confidence' ? 70 : 
                        emotion.id === 'fear' ? 30 : 
                        emotion.id === 'greed' ? 25 : 
                        emotion.id === 'doubt' ? 45 : 20;
                        
      // Add some variability
      const variability = Math.floor(Math.random() * 20) - 10; // -10 to +10
      dataPoint[emotion.id] = Math.max(5, Math.min(95, baseValue + variability)); // Keep between 5-95
    });
    
    return dataPoint;
  });
};

const emotionTrendData = generateEmotionTrendData();

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
              {emotions.map(emotion => (
                <Line 
                  key={emotion.id}
                  type="monotone" 
                  dataKey={emotion.id} 
                  stroke={
                    emotion.id === 'confidence' ? '#4ade80' : 
                    emotion.id === 'fear' ? '#f87171' : 
                    emotion.id === 'greed' ? '#fb923c' : 
                    emotion.id === 'doubt' ? '#60a5fa' : '#a855f7'
                  } 
                  name={emotion.label} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmotionTrendsChart;
