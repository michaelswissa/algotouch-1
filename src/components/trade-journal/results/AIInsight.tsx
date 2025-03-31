
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Brain, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AIInsightProps {
  insight: string;
  metrics: {
    ai: number;
    omrs: number;
  };
  isLoadingInsight?: boolean;
}

const AIInsight: React.FC<AIInsightProps> = ({ insight, metrics, isLoadingInsight = false }) => {
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
  );
};

export default AIInsight;
