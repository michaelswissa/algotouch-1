
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyQuestionnaire from '@/components/trade-journal/DailyQuestionnaire';
import QuestionnaireResults from '@/components/trade-journal/results';
import { useToast } from '@/hooks/use-toast';

const EmotionalTracker = () => {
  const [activeTab, setActiveTab] = useState('track');
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [insight, setInsight] = useState<string>('');
  const [interventionReasons, setInterventionReasons] = useState<string[]>([]);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const { toast } = useToast();

  const generateInsight = (metrics: any) => {
    // Simple local insight generation (mockup for demo)
    if (metrics.ai > 2.5) {
      return "רמת האזהרה גבוהה. מומלץ להימנע מהתערבויות ולקחת הפסקה קצרה.";
    } else if (metrics.omrs < 2.5) {
      return "המוכנות שלך למסחר היום נמוכה. שקול לקחת יום הפסקה.";
    } else if (metrics.ess > 3.5 && metrics.ii < 2) {
      return "מצבך המנטלי והרגשי נראה יציב היום. המשך עם הגישה הנוכחית.";
    } else {
      return "יש לבדוק את כל המדדים ולהחליט אם לסחור היום בהתאם לנתונים.";
    }
  };

  const handleQuestionnaireSubmit = async (data: {
    metrics: any,
    insight: string,
    interventionReasons: string[]
  }) => {
    setMetrics(data.metrics);
    setInterventionReasons(data.interventionReasons);
    
    // Simulate AI insight generation
    setIsLoadingInsight(true);
    
    setTimeout(() => {
      const generatedInsight = generateInsight(data.metrics);
      setInsight(generatedInsight);
      setIsLoadingInsight(false);
    }, 1500);
    
    setQuestionnaireSubmitted(true);
    setActiveTab('results');
    
    toast({
      title: "השאלון נשלח בהצלחה",
      description: "תוצאות הניתוח הרגשי מוצגות כעת",
      duration: 3000,
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      <Card className="mb-6">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
            <TabsList className="w-full rounded-t-lg rounded-b-none p-0 border-b bg-card">
              <TabsTrigger 
                value="track" 
                className="rounded-none flex-1 py-3 data-[state=active]:bg-secondary/30"
              >
                שאלון יומי
              </TabsTrigger>
              <TabsTrigger 
                value="results" 
                className={`rounded-none flex-1 py-3 data-[state=active]:bg-secondary/30 ${questionnaireSubmitted ? '' : 'text-muted-foreground'}`}
                disabled={!questionnaireSubmitted}
              >
                ניתוח רגשי
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="track" className="p-0 m-0">
              <DailyQuestionnaire onSubmit={handleQuestionnaireSubmit} />
            </TabsContent>
            
            <TabsContent value="results" className="p-0 m-0">
              {questionnaireSubmitted && metrics ? (
                <QuestionnaireResults 
                  metrics={metrics} 
                  insight={insight} 
                  interventionReasons={interventionReasons}
                  isLoadingInsight={isLoadingInsight}
                />
              ) : (
                <div className="text-center p-8 bg-card">
                  <h3 className="text-lg font-medium mb-2">ניתוח רגשי במסחר</h3>
                  <p className="text-muted-foreground">
                    הניתוח יוצג כאן לאחר מילוי השאלון היומי. מלא את השאלון היומי כדי לצפות בניתוח.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmotionalTracker;
