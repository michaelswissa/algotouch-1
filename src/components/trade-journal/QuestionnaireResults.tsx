
import React from 'react';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  BarChart3,
  PieChart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart as RechartPieChart, Pie, Cell } from 'recharts';

// Define the props for the QuestionnaireResults component
interface QuestionnaireResultsProps {
  metrics: {
    ess: number;
    ii: number;
    omrs: number;
    tg: number;
    ai: number;
  };
  insight: string;
  interventionReasons: string[];
}

// Map for translating reason codes to Hebrew labels
const reasonsLabelsMap: Record<string, string> = {
  "fear": "פחד מהפסד",
  "fix": "רצון לתקן",
  "distrust": "חוסר אמון באלגו",
  "greed": "חמדנות / פומו",
  "other": "סיבה אחרת"
};

// Define a custom tooltip for the bar chart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Define tooltip content based on metric
    const tooltipContent = {
      'ESS': 'יציבות רגשית - ככל שהערך גבוה יותר, המצב הרגשי יציב יותר',
      'II': 'מדד התערבות - ככל שהערך גבוה יותר, הנטייה להתערב גבוהה יותר',
      'OMRS': 'מוכנות מנטלית כוללת - ערך גבוה מעיד על מוכנות טובה למסחר',
      'TG': 'פער אמון - ככל שהערך גבוה יותר, האמון באלגוריתם נמוך יותר',
      'AI': 'מדד אזעקה - ערך גבוה (מעל 2.5) מצביע על מצב אזהרה'
    };
    
    return (
      <div className="bg-card border border-muted p-3 rounded-md shadow-md">
        <p className="font-medium text-base">{label}: {payload[0].value}</p>
        <p className="text-muted-foreground text-sm">{tooltipContent[label as keyof typeof tooltipContent]}</p>
      </div>
    );
  }
  return null;
};

// Define a custom tooltip for the pie chart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-muted p-3 rounded-md shadow-md">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-primary">{`${payload[0].value} (${(payload[0].percent * 100).toFixed(0)}%)`}</p>
      </div>
    );
  }
  return null;
};

// Colors for the pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const QuestionnaireResults: React.FC<QuestionnaireResultsProps> = ({ 
  metrics, 
  insight, 
  interventionReasons 
}) => {
  // Prepare data for the bar chart
  const barData = [
    { name: 'ESS', value: metrics.ess },
    { name: 'II', value: metrics.ii },
    { name: 'OMRS', value: metrics.omrs },
    { name: 'TG', value: metrics.tg },
    { name: 'AI', value: metrics.ai }
  ];
  
  // Prepare data for the pie chart (if there are intervention reasons)
  const pieData = interventionReasons.map(reason => ({
    name: reasonsLabelsMap[reason] || reason,
    value: 1
  }));
  
  // Determine alert level and icon based on metrics
  const getAlertLevel = () => {
    if (metrics.ai > 2.5) {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />,
        bgColor: "bg-red-100 dark:bg-red-900/20"
      };
    } else if (metrics.omrs < 3) {
      return {
        icon: <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />,
        bgColor: "bg-amber-100 dark:bg-amber-900/20"
      };
    } else {
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />,
        bgColor: "bg-green-100 dark:bg-green-900/20"
      };
    }
  };
  
  const alertLevel = getAlertLevel();
  
  return (
    <div className="space-y-6">
      {/* Metrics overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-card/50 p-3 rounded-lg shadow-sm border border-muted"
        >
          <div className="text-sm text-muted-foreground">יציבות רגשית (ESS)</div>
          <div className="text-xl font-bold mt-1">{metrics.ess}</div>
          <div className="text-xs text-muted-foreground mt-1">ממוצע 5 מדדי הרגש</div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-card/50 p-3 rounded-lg shadow-sm border border-muted"
        >
          <div className="text-sm text-muted-foreground">מדד התערבות (II)</div>
          <div className="text-xl font-bold mt-1">{metrics.ii}</div>
          <div className="text-xs text-muted-foreground mt-1">נטייה להתערב בפעילות האלגו</div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-card/50 p-3 rounded-lg shadow-sm border border-muted"
        >
          <div className="text-sm text-muted-foreground">מוכנות מנטלית (OMRS)</div>
          <div className="text-xl font-bold mt-1">{metrics.omrs}</div>
          <div className="text-xs text-muted-foreground mt-1">מוכנות כוללת למסחר</div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-card/50 p-3 rounded-lg shadow-sm border border-muted"
        >
          <div className="text-sm text-muted-foreground">פער אמון (TG)</div>
          <div className="text-xl font-bold mt-1">{metrics.tg}</div>
          <div className="text-xs text-muted-foreground mt-1">פער מהאמון המקסימלי</div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className={`p-3 rounded-lg shadow-sm border border-muted ${
            metrics.ai > 2.5 ? "bg-red-50 dark:bg-red-900/10 border-red-200" : "bg-card/50"
          }`}
        >
          <div className="text-sm text-muted-foreground">מדד אזעקה (AI)</div>
          <div className={`text-xl font-bold mt-1 ${
            metrics.ai > 2.5 ? "text-red-600 dark:text-red-400" : ""
          }`}>{metrics.ai}</div>
          <div className="text-xs text-muted-foreground mt-1">סף אזהרה: 2.5</div>
        </motion.div>
      </div>
      
      {/* Insight box */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`p-4 rounded-md ${alertLevel.bgColor}`}
      >
        <div className="flex gap-3">
          {alertLevel.icon}
          <p className="text-base">{insight}</p>
        </div>
      </motion.div>
      
      {/* Charts section */}
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
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 5]} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="value" name="ערך" fill="#0066FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-muted-foreground mt-3 text-center">
            הערה: מדד ה-AI מעל 2.5 מהווה אזהרה, ומדד OMRS מתחת ל-3 מצביע על מוכנות נמוכה
          </div>
        </motion.div>
        
        {/* Pie Chart - only show if there are intervention reasons */}
        {interventionReasons.length > 0 && (
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
              התפלגות הסיבות להתערבות בפעילות האלגוריתם
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Explanations section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-card/50 p-4 rounded-lg shadow-sm border border-muted"
      >
        <h3 className="text-base font-medium mb-3">הסבר המדדים:</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="font-medium">ESS (Emotional Stability Score):</span>
            <span className="text-muted-foreground">ממוצע של 5 מדדים: מצב רגשי, אמון באלגו, כושר למסחר, משמעת ושליטה עצמית.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-medium">II (Intervention Index):</span>
            <span className="text-muted-foreground">משקלל את הדחף להתערב עם השפעת בדיקת הביצועים מאתמול.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-medium">OMRS (Overall Mental Readiness Score):</span>
            <span className="text-muted-foreground">מדד מוכנות כולל המשקלל את כל הפרמטרים. נעים בין 1-5, כשערך גבוה חיובי.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-medium">TG (Trust Gap):</span>
            <span className="text-muted-foreground">הפער בין האמון המקסימלי לאמון הנוכחי. ערך גבוה מצביע על חוסר אמון.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-medium">AI (Alert Index):</span>
            <span className="text-muted-foreground">מדד המשקלל גורמי סיכון להתנהגות רגשית לא יציבה. ערך מעל 2.5 מהווה אזהרה.</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
};

export default QuestionnaireResults;
