
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyQuestionnaire from '@/components/trade-journal/DailyQuestionnaire';
import TradeJournalHeader from '@/components/trade-journal/TradeJournalHeader';
import TradeNotes from '@/components/trade-journal/TradeNotes';
import { tradeNotes } from '@/components/trade-journal/mockData';
import QuestionnaireResults from '@/components/trade-journal/QuestionnaireResults';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TradeJournalPage = () => {
  const [activeTab, setActiveTab] = useState('questionnaire');
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [insight, setInsight] = useState<string>('');
  const [interventionReasons, setInterventionReasons] = useState<string[]>([]);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const { toast } = useToast();
  
  const handleNewNote = () => {
    // Future functionality for creating a new note
  };

  const generateAIInsight = async (metrics: any) => {
    setIsLoadingInsight(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insight', {
        body: { metrics, experienceLevel: 'מנוסה' }
      });

      if (error) {
        console.error('Error calling generate-insight function:', error);
        toast({
          title: "שגיאה בקבלת תובנה",
          description: "לא הצלחנו לקבל תובנה מותאמת אישית. משתמש בתובנה בסיסית.",
          variant: "destructive",
          duration: 5000,
        });
        return "נראה שיש לך יום מאתגר. שקול להפחית את רמת ההתערבות באלגוריתם ולעקוב אחר הביצועים בזהירות.";
      }

      console.log('AI Insight data:', data);
      return data.insight;
    } catch (err) {
      console.error('Error generating AI insight:', err);
      toast({
        title: "שגיאה בקבלת תובנה",
        description: "אירעה שגיאה בעת יצירת התובנה המותאמת. הנתונים שלך זמינים לצפייה.",
        variant: "destructive",
        duration: 5000,
      });
      return "בדוק את המדדים שלך ופעל בזהירות היום.";
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const handleQuestionnaireSubmit = async (data: {
    metrics: any,
    insight: string,
    interventionReasons: string[]
  }) => {
    setMetrics(data.metrics);
    setInterventionReasons(data.interventionReasons);
    
    // Get AI-generated insight
    try {
      const aiInsight = await generateAIInsight(data.metrics);
      setInsight(aiInsight);
    } catch (error) {
      console.error('Failed to get AI insight:', error);
      setInsight(data.insight); // Use static insight as fallback
    }
    
    setQuestionnaireSubmitted(true);
    setActiveTab('analysis');
  };

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <TradeJournalHeader onNewNote={handleNewNote} />
        
        {/* Horizontal scrollable notes section */}
        <TradeNotes notes={tradeNotes} />
        
        {/* Main content area with tabs */}
        <div className="space-y-6 animate-fade-in mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
            <TabsList className="mb-6 bg-slate-900/30 dark:bg-white/5 p-1 rounded-lg flex justify-end gap-2">
              <TabsTrigger 
                value="analysis" 
                className={`text-sm font-medium px-4 py-2 ${questionnaireSubmitted ? 'text-primary' : 'text-muted-foreground'}`}
                disabled={!questionnaireSubmitted}
              >
                ניתוח רגשי
              </TabsTrigger>
              <TabsTrigger value="questionnaire" className="text-sm font-medium px-4 py-2">שאלון יומי</TabsTrigger>
            </TabsList>
            
            <TabsContent value="questionnaire" className="space-y-6">
              <DailyQuestionnaire onSubmit={handleQuestionnaireSubmit} />
            </TabsContent>
            
            <TabsContent value="analysis" className="space-y-6">
              {questionnaireSubmitted && metrics ? (
                <QuestionnaireResults 
                  metrics={metrics} 
                  insight={insight} 
                  interventionReasons={interventionReasons}
                  isLoadingInsight={isLoadingInsight}
                />
              ) : (
                <div className="text-center p-8 bg-card rounded-lg shadow-md">
                  <h3 className="text-lg font-medium mb-2">ניתוח רגשי במסחר</h3>
                  <p className="text-muted-foreground">
                    הניתוח יוצג כאן לאחר מילוי השאלון היומי. מלא את השאלון היומי כדי לצפות בניתוח.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default TradeJournalPage;
