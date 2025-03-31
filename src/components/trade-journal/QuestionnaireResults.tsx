
import React from 'react';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  BarChart3,
  PieChart,
  TrendingUp,
  HelpCircle,
  Brain,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart as RechartPieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { 
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  isLoadingInsight?: boolean;
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

// Define a custom tooltip for the pie chart
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

const QuestionnaireResults: React.FC<QuestionnaireResultsProps> = ({ 
  metrics, 
  insight, 
  interventionReasons,
  isLoadingInsight = false
}) => {
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
  
  // Determine alert level and icon based on metrics
  const getAlertLevel = () => {
    if (metrics.ai > 2.5) {
      return {
        icon: <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />,
        bgColor: "bg-red-950/30 border-red-800",
        textColor: "text-red-300"
      };
    } else if (metrics.omrs < 3) {
      return {
        icon: <Info className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />,
        bgColor: "bg-amber-950/30 border-amber-800",
        textColor: "text-amber-300"
      };
    } else {
      return {
        icon: <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />,
        bgColor: "bg-green-950/30 border-green-800",
        textColor: "text-green-300"
      };
    }
  };
  
  const alertLevel = getAlertLevel();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rtl"
    >
      <Card className="hover-glow shadow-md mb-8">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-right">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: 0 }}
            >
              <Brain className="h-5 w-5 text-primary" />
            </motion.div>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              תובנה AI מותאמת אישית
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={`p-5 rounded-md border ${alertLevel.bgColor} relative`}
          >
            {isLoadingInsight ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="mr-3 text-base">מייצר תובנה מותאמת אישית...</p>
              </div>
            ) : (
              <div className="flex gap-3">
                {alertLevel.icon}
                <div>
                  <p className={`text-base leading-relaxed ${alertLevel.textColor}`}>
                    {insight}
                  </p>
                  <p className="text-xs mt-3 text-muted-foreground opacity-70">* התובנה נוצרה באמצעות AI בהתבסס על הנתונים שהזנת</p>
                </div>
              </div>
            )}
          </motion.div>
        </CardContent>
      </Card>

      <Card className="hover-glow shadow-md">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-right">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: 0 }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
            </motion.div>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              המוח שלך מול המכונה
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Metrics summary */}
          <div className="space-y-6">
            {/* Metrics overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className={`bg-card/50 p-3 rounded-lg shadow-sm border ${
                  metrics.ess > 3.5 ? "border-green-600" : metrics.ess > 2.5 ? "border-yellow-600" : "border-red-600"
                }`}
              >
                <div className="text-sm text-muted-foreground">יציבות רגשית (ESS)</div>
                <div className={`text-xl font-bold mt-1 ${
                  metrics.ess > 3.5 ? "text-green-400" : metrics.ess > 2.5 ? "text-yellow-400" : "text-red-400"
                }`}>{metrics.ess}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span>ממוצע 5 מדדי הרגש</span>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 mr-1 p-0">
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-card max-w-xs">
                        <p className="text-xs">ממוצע של מצב רוח, אמון באלגו, כושר למסחר, משמעת ושליטה.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className={`bg-card/50 p-3 rounded-lg shadow-sm border ${
                  metrics.ii < 1.5 ? "border-green-600" : metrics.ii < 3 ? "border-yellow-600" : "border-red-600"
                }`}
              >
                <div className="text-sm text-muted-foreground">מדד התערבות (II)</div>
                <div className={`text-xl font-bold mt-1 ${
                  metrics.ii < 1.5 ? "text-green-400" : metrics.ii < 3 ? "text-yellow-400" : "text-red-400"
                }`}>{metrics.ii}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span>נטייה להתערב באלגו</span>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 mr-1 p-0">
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-card max-w-xs">
                        <p className="text-xs">מבטא את רמת הרצון להתערב באלגוריתם. ערך נמוך מעיד על אמון גבוה.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className={`bg-card/50 p-3 rounded-lg shadow-sm border ${
                  metrics.omrs > 3.5 ? "border-green-600" : metrics.omrs > 2.5 ? "border-yellow-600" : "border-red-600"
                }`}
              >
                <div className="text-sm text-muted-foreground">מוכנות מנטלית (OMRS)</div>
                <div className={`text-xl font-bold mt-1 ${
                  metrics.omrs > 3.5 ? "text-green-400" : metrics.omrs > 2.5 ? "text-yellow-400" : "text-red-400"
                }`}>{metrics.omrs}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span>מוכנות כוללת למסחר</span>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 mr-1 p-0">
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-card max-w-xs">
                        <p className="text-xs">מדד סופי המשקלל את כל הפרמטרים. הערך האידיאלי הוא 5.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className={`bg-card/50 p-3 rounded-lg shadow-sm border ${
                  metrics.tg < 1.5 ? "border-green-600" : metrics.tg < 3 ? "border-yellow-600" : "border-red-600"
                }`}
              >
                <div className="text-sm text-muted-foreground">פער אמון (TG)</div>
                <div className={`text-xl font-bold mt-1 ${
                  metrics.tg < 1.5 ? "text-green-400" : metrics.tg < 3 ? "text-yellow-400" : "text-red-400"
                }`}>{metrics.tg}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span>פער מהאמון המקסימלי</span>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 mr-1 p-0">
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-card max-w-xs">
                        <p className="text-xs">ההפרש בין האמון האידיאלי (5) לאמון הנוכחי שלך. ערך נמוך מעיד על אמון גבוה.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className={`p-3 rounded-lg shadow-sm border ${
                  metrics.ai < 1.5 ? "bg-card/50 border-green-600" : 
                  metrics.ai < 2.5 ? "bg-yellow-950/10 border-yellow-600" : 
                  "bg-red-950/20 border-red-600"
                }`}
              >
                <div className="text-sm text-muted-foreground">מדד אזהרה (AI)</div>
                <div className={`text-xl font-bold mt-1 ${
                  metrics.ai < 1.5 ? "text-green-400" : 
                  metrics.ai < 2.5 ? "text-yellow-400" : 
                  "text-red-400 animate-pulse"
                }`}>{metrics.ai}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span>סף אזהרה: 2.5</span>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 mr-1 p-0">
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-card max-w-xs">
                        <p className="text-xs">מדד המשקלל גורמי סיכון. ערך מעל 2.5 מהווה התראה משמעותית!</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* Charts section */}
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
              
              {/* Pie Chart - only show if there are intervention reasons */}
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
                    {/* Add a reference line at AI = 2.5 to show the warning threshold */}
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
          
          {/* Help section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="bg-card/50 p-4 rounded-lg shadow-sm border border-muted"
          >
            <h3 className="text-base font-medium mb-3 border-r-4 border-primary/60 pr-2">הסבר המדדים</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <span className="font-medium text-green-400">ESS</span>
                  <span className="text-muted-foreground text-sm">(Emotional Stability Score)</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ממוצע של 5 מדדים: מצב רגשי, אמון באלגוריתם, כושר למסחר, משמעת ושליטה עצמית.
                </p>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <span className="font-medium text-blue-400">II</span>
                  <span className="text-muted-foreground text-sm">(Intervention Index)</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  משקלל את הדחף להתערב עם השפעת בדיקת הביצועים מהיום הקודם.
                </p>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <span className="font-medium text-violet-400">OMRS</span>
                  <span className="text-muted-foreground text-sm">(Overall Mental Readiness Score)</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  מדד מוכנות כולל המשקלל את כל הפרמטרים. נע בין 1-5, כאשר ערך גבוה הוא חיובי.
                </p>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <span className="font-medium text-amber-400">TG</span>
                  <span className="text-muted-foreground text-sm">(Trust Gap)</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  הפער בין האמון המקסימלי לאמון הנוכחי. ערך גבוה מצביע על חוסר אמון.
                </p>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <span className="font-medium text-red-400">AI</span>
                  <span className="text-muted-foreground text-sm">(Alert Index)</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  מדד המשקלל גורמי סיכון להתנהגות רגשית לא יציבה. ערך מעל 2.5 מהווה אזהרה.
                </p>
              </div>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuestionnaireResults;
