
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart as RechartPieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface ResultsChartsProps {
  metrics: {
    ess: number;
    ii: number;
    omrs: number;
    tg: number;
    ai: number;
  };
  interventionReasons: string[];
}

// Custom tooltips
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Define tooltip content based on metric
    const tooltipContent: Record<string, string> = {
      'ESS': 'יציבות רגשית - ככל שהערך גבוה יותר, המצב הרגשי יציב יותר',
      'II': 'מדד התערבות - ככל שהערך גבוה יותר, הנטייה להתערב גבוהה יותר',
      'OMRS': 'מוכנות מנטלית כוללת - ערך גבוה מעיד על מוכנות טובה למסחר',
      'TG': 'פער אמון - ככל שהערך גבוה יותר, האמון באלגוריתם נמוך יותר',
      'AI': 'מדד אזהרה - ערך גבוה (מעל 2.5) מצביע על מצב אזהרה'
    };
    
    return (
      <div className="bg-card border border-muted p-3 rounded-md shadow-md rtl text-right">
        <p className="font-medium text-base">{label}: {payload[0].value}</p>
        <p className="text-muted-foreground text-sm">{tooltipContent[label]}</p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-muted p-3 rounded-md shadow-md rtl text-right">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-primary">{`${payload[0].value} (${(payload[0].percent * 100).toFixed(0)}%)`}</p>
      </div>
    );
  }
  return null;
};

// Colors for the pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Generate time series data for a trend chart
const generateTrendData = (currentValue: number, metric: string) => {
  // Simulate past 7 days of data with some variance
  const baseValue = currentValue * 0.8;
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    const date = `${day.getDate()}/${day.getMonth() + 1}`;
    
    // Calculate value with some randomness, staying within reasonable bounds
    let value;
    if (i === 6) {
      // Today's value is the current value
      value = currentValue;
    } else {
      // Past values fluctuate around a trend line
      const trend = baseValue + ((currentValue - baseValue) * (i / 6));
      const variance = Math.random() * 0.5 - 0.25; // Random variance between -0.25 and 0.25
      value = Math.max(0, Math.min(5, trend + variance));
    }
    
    return {
      name: date,
      [metric]: parseFloat(value.toFixed(2))
    };
  });
};

// Map for translating reason codes to Hebrew labels
const reasonsLabelsMap: Record<string, string> = {
  "fear": "פחד מהפסד",
  "fix": "רצון לתקן",
  "distrust": "חוסר אמון באלגו",
  "greed": "חמדנות / פומו",
  "other": "סיבה אחרת"
};

const ResultsCharts: React.FC<ResultsChartsProps> = ({ metrics, interventionReasons }) => {
  // Prepare data for the bar chart
  const barData = [
    { 
      name: 'ESS', 
      value: metrics.ess, 
      fill: metrics.ess > 3.5 ? '#22c55e' : metrics.ess > 2.5 ? '#eab308' : '#ef4444',
    },
    { 
      name: 'II', 
      value: metrics.ii, 
      fill: metrics.ii < 1.5 ? '#22c55e' : metrics.ii < 3 ? '#eab308' : '#ef4444',
    },
    { 
      name: 'OMRS', 
      value: metrics.omrs, 
      fill: metrics.omrs > 3.5 ? '#22c55e' : metrics.omrs > 2.5 ? '#eab308' : '#ef4444',
    },
    { 
      name: 'TG', 
      value: metrics.tg, 
      fill: metrics.tg < 1.5 ? '#22c55e' : metrics.tg < 3 ? '#eab308' : '#ef4444',
    },
    { 
      name: 'AI', 
      value: metrics.ai, 
      fill: metrics.ai < 1.5 ? '#22c55e' : metrics.ai < 2.5 ? '#eab308' : '#ef4444',
    }
  ];
  
  // Prepare data for the pie chart (if there are intervention reasons)
  const reasonsCleaned = interventionReasons.map(reason => {
    // Handle the case where the reason is "other:something"
    if (reason.startsWith('other:')) {
      return 'other';
    }
    return reason;
  });
  
  // Count occurrences of each reason
  const reasonCounts: Record<string, number> = {};
  reasonsCleaned.forEach(reason => {
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });
  
  // Create pie data with counts
  const pieData = Object.entries(reasonCounts).map(([reason, count]) => ({
    name: reasonsLabelsMap[reason] || reason,
    value: count
  }));
  
  // Generate trend data for OMRS and AI
  const omrsTrendData = generateTrendData(metrics.omrs, 'OMRS');
  const aiTrendData = generateTrendData(metrics.ai, 'AI');
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-card/30 p-4 rounded-lg shadow-sm border border-muted"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              מדדים מרכזיים
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#ccc" }} />
                <YAxis tick={{ fontSize: 12, fill: "#ccc" }} domain={[0, 5]} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: "#fff" }} />
                <Bar 
                  dataKey="value" 
                  name="ערך" 
                  radius={[4, 4, 0, 0]} 
                  fillOpacity={0.8}
                  stroke="#0066FF"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-muted-foreground mt-3 text-center">
            ערך OMRS אידיאלי: 3.5+ | ערך AI מדאיג: 2.5+
          </div>
        </motion.div>
        
        {/* Pie Chart or Trend Chart */}
        {interventionReasons.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-card/30 p-4 rounded-lg shadow-sm border border-muted"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                סיבות להתערבות
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </RechartPieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground mt-3 text-center">
              התפלגות הסיבות שהביאו להתערבות בפעילות האלגוריתם
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-card/30 p-4 rounded-lg shadow-sm border border-muted"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                מגמות שבועיות
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={omrsTrendData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#ccc" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#ccc" }} domain={[0, 5]} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px', color: "#fff" }} />
                  <Line 
                    type="monotone" 
                    dataKey="OMRS" 
                    name="מוכנות מנטלית" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground mt-3 text-center">
              מגמת המוכנות המנטלית שלך בשבוע האחרון
            </div>
          </motion.div>
        )}
      </div>
      
      {/* AI trend chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="bg-card/30 p-4 rounded-lg shadow-sm border border-muted"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            מדד האזהרה השבועי
          </h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={aiTrendData}
              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#ccc" }} />
              <YAxis tick={{ fontSize: 12, fill: "#ccc" }} domain={[0, 5]} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px', color: "#fff" }} />
              <Line 
                type="monotone" 
                dataKey="AI" 
                name="מדד אזהרה" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-muted-foreground mt-3 text-center">
          ערך מדד האזהרה מעל 2.5 מצביע על סיכון ומצריך זהירות
        </div>
      </motion.div>
    </div>
  );
};

export default ResultsCharts;
