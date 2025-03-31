
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client'; 
import { Loader2 } from 'lucide-react';

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
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);

  useEffect(() => {
    const generateInsight = async () => {
      try {
        setIsLoadingInsight(true);
        
        // Calculate metrics for AI insight generation
        const ess = data.emotional.state === '😎' || data.emotional.state === '🙂' ? 4.5 : 
                   data.emotional.state === '😐' ? 3 : 2;
        
        const ii = data.intervention.level === 'none' ? 0 : 
                  data.intervention.level === 'wanted' ? 2 : 3.5;
        
        const omrs = data.confidence.level;
        
        const tg = data.algoPerformance.checked === 'yes' ? 0.5 : 1.5;
        
        const ai = Math.max(
          (data.emotional.state === '😣' ? 1 : 0),
          (data.intervention.level === 'intervened' ? 1 : 0),
          (data.market.surprise === 'yes' ? 0.5 : 0),
          (data.confidence.level < 3 ? 1 : 0)
        );
        
        const metrics = { ess, ii, omrs, tg, ai };
        
        const { data: insightData, error } = await supabase.functions.invoke('generate-insight', {
          body: { metrics, experienceLevel: 'מנוסה' }
        });
        
        if (error) {
          console.error('Error generating insight:', error);
          setAiInsight('אירעה שגיאה בקבלת התובנה. בדוק את המדדים שלך ופעל בזהירות היום.');
        } else {
          setAiInsight(insightData.insight);
        }
      } catch (error) {
        console.error('Error:', error);
        setAiInsight('לא ניתן היה לייצר תובנה כרגע. נסה שוב מאוחר יותר.');
      } finally {
        setIsLoadingInsight(false);
      }
    };

    generateInsight();
  }, [data]);

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
      dir="rtl"
    >
      <Card className="shadow-lg border-primary/20 hover:shadow-xl transition-all duration-500">
        <CardHeader className="bg-primary/5 pb-4 border-b border-border/30">
          <CardTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            🚀 דוח יומי | {data.date}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {aiInsight ? (
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                ✨ תובנת AI מותאמת אישית
              </h3>
              {isLoadingInsight ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-6 w-6 text-primary animate-spin ml-2" />
                  <p>מייצר תובנה...</p>
                </div>
              ) : (
                <p className="text-primary/90">{aiInsight}</p>
              )}
            </div>
          ) : isLoadingInsight ? (
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                ✨ תובנת AI מותאמת אישית
              </h3>
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-6 w-6 text-primary animate-spin ml-2" />
                <p>מייצר תובנה...</p>
              </div>
            </div>
          ) : null}
          
          <EmotionalState data={data.emotional} />
          
          <Separator className="my-6" />
          
          <ReportMetrics data={data} />
          
          {data.insight && (
            <>
              <Separator className="my-6" />
              
              <DailyInsightSection insight={data.insight} />
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TradingReport;
