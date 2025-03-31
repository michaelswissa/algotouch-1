
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';

import EmotionalState from './report/EmotionalState';
import ReportMetrics from './report/ReportMetrics';
import DailyInsightSection from './report/DailyInsightSection';
import AIInsightSection from './report/AIInsightSection';

interface TradingReportProps {
  data: {
    date: string;
    emotional: {
      state: string;
      notes?: string;
    };
    intervention: {
      level: string;
      reasons: string[];
    };
    market: {
      surprise: string;
      notes?: string;
    };
    confidence: {
      level: number;
    };
    algoPerformance: {
      checked: string;
      notes?: string;
    };
    risk: {
      percentage: number;
      comfortLevel: number;
    };
    insight?: string;
  };
}

const TradingReport: React.FC<TradingReportProps> = ({ data }) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  return (
    <motion.div
      className="max-w-3xl mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <Card className="shadow-lg border-primary/20 hover:shadow-xl transition-all duration-500">
        <CardHeader className="bg-primary/5 pb-4 border-b border-border/30">
          <CardTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            🚀 דוח יומי | {data.date}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <EmotionalState data={data.emotional} />
          
          <Separator className="my-6" />
          
          <ReportMetrics data={data} />
          
          {data.insight && (
            <>
              <Separator className="my-6" />
              
              <DailyInsightSection insight={data.insight} />
            </>
          )}
          
          <Separator className="my-6" />
          
          <AIInsightSection />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TradingReport;
