
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AIInsight from './AIInsight';
import MetricsOverview from './MetricsOverview';
import ResultsCharts from './ResultsCharts';
import MetricsExplanation from './MetricsExplanation';
import { BarChart3 } from 'lucide-react';

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

const QuestionnaireResults: React.FC<QuestionnaireResultsProps> = ({ 
  metrics, 
  insight, 
  interventionReasons,
  isLoadingInsight = false
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rtl"
    >
      <AIInsight 
        insight={insight} 
        metrics={metrics} 
        isLoadingInsight={isLoadingInsight} 
      />

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
          <MetricsOverview metrics={metrics} />
          
          {/* Charts section */}
          <ResultsCharts 
            metrics={metrics}
            interventionReasons={interventionReasons}
          />
          
          {/* Help section */}
          <MetricsExplanation />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuestionnaireResults;
