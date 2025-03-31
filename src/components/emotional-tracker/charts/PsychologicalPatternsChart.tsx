
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
  ReferenceLine,
} from 'recharts';
import { psychologicalPatterns } from '../data/psychological-patterns';

// Define the data structure for pattern frequency
interface PatternFrequencyData {
  name: string;
  frequency: number;
  impact: number;
  category: 'cognitive' | 'emotional' | 'behavioral';
  fill: string;
}

// Generate mock data for pattern frequency
const generatePatternFrequencyData = (): PatternFrequencyData[] => {
  return psychologicalPatterns.map(pattern => ({
    name: pattern.name,
    frequency: Math.floor(Math.random() * 100), // Random frequency between 0-100
    impact: pattern.riskLevel === 'high' ? 8 : pattern.riskLevel === 'medium' ? 5 : 3,
    category: pattern.category,
    fill: pattern.category === 'cognitive' ? '#60a5fa' : 
          pattern.category === 'emotional' ? '#f87171' : '#a855f7'
  }));
};

interface PsychologicalPatternsChartProps {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  sortBy?: 'frequency' | 'impact' | 'category';
  limit?: number;
}

const PsychologicalPatternsChart: React.FC<PsychologicalPatternsChartProps> = ({
  timeRange = 'month',
  sortBy = 'frequency',
  limit = 5
}) => {
  // Generate and process data
  const patternData = generatePatternFrequencyData();
  
  // Sort data based on sortBy parameter
  const sortedData = [...patternData].sort((a, b) => {
    if (sortBy === 'frequency') return b.frequency - a.frequency;
    if (sortBy === 'impact') return b.impact - a.impact;
    if (sortBy === 'category') return a.category.localeCompare(b.category);
    return 0;
  });
  
  // Limit the number of patterns shown
  const limitedData = sortedData.slice(0, limit);
  
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
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pattern = psychologicalPatterns.find(p => p.name === label);
      
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded shadow-md">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground mb-1">{pattern?.description || ''}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <p className="text-sm">
              <span className="text-muted-foreground">תדירות:</span> {payload[0].value}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">השפעה:</span> {payload[1].value}/10
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">קטגוריה:</span> {
                pattern?.category === 'cognitive' ? 'קוגניטיבי' :
                pattern?.category === 'emotional' ? 'רגשי' : 'התנהגותי'
              }
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">רמת סיכון:</span> {
                pattern?.riskLevel === 'high' ? 'גבוהה' :
                pattern?.riskLevel === 'medium' ? 'בינונית' : 'נמוכה'
              }
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
          דפוסים פסיכולוגיים {getTimeRangeText()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={limitedData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine x={50} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'סף התראה', position: 'top', fill: '#fbbf24' }} />
              <Bar dataKey="frequency" name="תדירות" fill="#60a5fa" />
              <Bar dataKey="impact" name="השפעה" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Additional insights */}
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">תובנות מרכזיות</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {limitedData[0]?.frequency > 70 
              ? `ה${limitedData[0].name} הוא הדפוס הדומיננטי ביותר שלך. מומלץ להתמקד בהפחתת דפוס זה.`
              : limitedData[0]?.frequency > 50
              ? `ה${limitedData[0].name} מופיע בתדירות גבוהה. שים לב לסימנים המקדימים שלו.`
              : `לא זוהו דפוסים פסיכולוגיים בתדירות גבוהה במיוחד. המשך לשמור על מודעות.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PsychologicalPatternsChart;
