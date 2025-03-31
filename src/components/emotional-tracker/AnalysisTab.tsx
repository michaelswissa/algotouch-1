
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmotionTrendsChart from './charts/EmotionTrendsChart';
import EnhancedEmotionDistributionChart from './charts/EnhancedEmotionDistributionChart';
import EmotionImpactChart from './charts/EmotionImpactChart';
import PsychologicalPatternsChart from './charts/PsychologicalPatternsChart';

const AnalysisTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [emotionMetric, setEmotionMetric] = useState<'winRate' | 'profitFactor' | 'avgWin' | 'avgLoss'>('winRate');
  
  return (
    <div className="space-y-6 rtl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">ניתוח רגשי ופסיכולוגי</h2>
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="טווח זמן" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">שבוע אחרון</SelectItem>
            <SelectItem value="month">חודש אחרון</SelectItem>
            <SelectItem value="quarter">רבעון אחרון</SelectItem>
            <SelectItem value="year">שנה אחרונה</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedEmotionDistributionChart timeRange={timeRange} />
        <EmotionTrendsChart timeRange={timeRange} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-end mb-2">
            <Select value={emotionMetric} onValueChange={(value: any) => setEmotionMetric(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="מדד ביצועים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="winRate">אחוז הצלחה</SelectItem>
                <SelectItem value="profitFactor">מכפיל רווח</SelectItem>
                <SelectItem value="avgWin">רווח ממוצע</SelectItem>
                <SelectItem value="avgLoss">הפסד ממוצע</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <EmotionImpactChart metric={emotionMetric} />
        </div>
        <PsychologicalPatternsChart timeRange={timeRange} />
      </div>
    </div>
  );
};

export default AnalysisTab;
