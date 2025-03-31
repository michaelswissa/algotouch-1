
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
  ReferenceLine,
} from 'recharts';
import { enhancedEmotions } from '../data/enhanced-emotions';

// Define the data structure for emotion trends
interface EmotionTrendData {
  date: string;
  [key: string]: string | number;
}

// Generate mock data for emotion trends
const generateEmotionTrendData = (): EmotionTrendData[] => {
  // Create dates for the last 10 days
  const dates = Array.from({ length: 10 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (9 - i));
    return date.toISOString().split('T')[0];
  });
  
  // Generate random values for each emotion
  return dates.map(date => {
    const dataPoint: EmotionTrendData = { date };
    
    // Add values for key emotions
    enhancedEmotions.slice(0, 5).forEach(emotion => {
      dataPoint[emotion.id] = Math.floor(Math.random() * 100);
    });
    
    return dataPoint;
  });
};

interface EmotionTrendsChartProps {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  emotionsToShow?: string[];
}

const EmotionTrendsChart: React.FC<EmotionTrendsChartProps> = ({
  timeRange = 'week',
  emotionsToShow = ['confidence', 'fear', 'frustration', 'satisfaction', 'anxiety']
}) => {
  // Generate and process data
  const trendData = generateEmotionTrendData();
  
  // Get emotion color by ID
  const getEmotionColor = (emotionId: string): string => {
    const emotion = enhancedEmotions.find(e => e.id === emotionId);
    if (!emotion) return '#8b5cf6';
    
    switch (emotionId) {
      case 'confidence': return '#4ade80';
      case 'fear': return '#f87171';
      case 'frustration': return '#a855f7';
      case 'satisfaction': return '#10b981';
      case 'anxiety': return '#f43f5e';
      case 'patience': return '#14b8a6';
      case 'impatience': return '#f59e0b';
      case 'calmness': return '#0ea5e9';
      case 'doubt': return '#60a5fa';
      case 'greed': return '#fb923c';
      case 'overconfidence': return '#84cc16';
      default: return '#8b5cf6';
    }
  };
  
  // Get emotion label by ID
  const getEmotionLabel = (emotionId: string): string => {
    const emotion = enhancedEmotions.find(e => e.id === emotionId);
    return emotion ? emotion.label : emotionId;
  };
  
  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  };
  
  // Get time range display text
  const getTimeRangeText = () => {
    switch (timeRange) {
      case 'week': return 'בשבוע האחרון';
      case 'month': return 'בחודש האחרון';
      case 'quarter': return 'ברבעון האחרון';
      case 'year': return 'בשנה האחרונה';
      default: return 'בשבוע האחרון';
    }
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded shadow-md">
          <p className="font-medium">{formatDate(label)}</p>
          <div className="mt-2 space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <p className="text-sm">
                  <span className="text-muted-foreground">{getEmotionLabel(entry.dataKey)}:</span> {entry.value}
                </p>
              </div>
            ))}
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
          <LineChartIcon size={18} className="text-primary" />
          מגמות רגשיות לאורך זמן {getTimeRangeText()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={70} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'רמה גבוהה', position: 'right', fill: '#fbbf24' }} />
              
              {emotionsToShow.map((emotionId) => (
                <Line
                  key={emotionId}
                  type="monotone"
                  dataKey={emotionId}
                  name={getEmotionLabel(emotionId)}
                  stroke={getEmotionColor(emotionId)}
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Insights section */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">תובנות מגמה</h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            {(() => {
              // Find the emotion with the highest average value
              const emotionAverages = emotionsToShow.map(emotionId => {
                const sum = trendData.reduce((acc, dataPoint) => acc + (dataPoint[emotionId] as number), 0);
                return { id: emotionId, average: sum / trendData.length };
              });
              
              const dominantEmotion = emotionAverages.sort((a, b) => b.average - a.average)[0];
              
              // Check if there's a rising trend in any negative emotion
              const lastIndex = trendData.length - 1;
              const risingNegativeEmotions = emotionsToShow
                .filter(emotionId => {
                  const emotion = enhancedEmotions.find(e => e.id === emotionId);
                  return emotion?.category === 'negative';
                })
                .filter(emotionId => {
                  const firstValue = trendData[0][emotionId] as number;
                  const lastValue = trendData[lastIndex][emotionId] as number;
                  return lastValue > firstValue * 1.5; // 50% increase
                });
              
              if (risingNegativeEmotions.length > 0) {
                const emotionName = getEmotionLabel(risingNegativeEmotions[0]);
                return `זוהתה עלייה משמעותית ברמת ה${emotionName}. מומלץ לשים לב לגורמים שעשויים להשפיע על כך.`;
              } else {
                return `ה${getEmotionLabel(dominantEmotion.id)} הוא הרגש הדומיננטי ביותר בתקופה זו עם ממוצע של ${dominantEmotion.average.toFixed(0)}.`;
              }
            })()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmotionTrendsChart;
