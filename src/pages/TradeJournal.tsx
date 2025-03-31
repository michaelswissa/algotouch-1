
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyQuestionnaire from '@/components/trade-journal/DailyQuestionnaire';
import TradeJournalHeader from '@/components/trade-journal/TradeJournalHeader';
import TradeNotes from '@/components/trade-journal/TradeNotes';
import { tradeNotes } from '@/components/trade-journal/mockData';
import QuestionnaireResults from '@/components/trade-journal/QuestionnaireResults';

const TradeJournalPage = () => {
  const [activeTab, setActiveTab] = useState('questionnaire');
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [insight, setInsight] = useState<string>('');
  const [interventionReasons, setInterventionReasons] = useState<string[]>([]);
  
  const handleNewNote = () => {
    // Future functionality for creating a new note
  };

  const handleQuestionnaireSubmit = (data: {
    metrics: any,
    insight: string,
    interventionReasons: string[]
  }) => {
    setMetrics(data.metrics);
    setInsight(data.insight);
    setInterventionReasons(data.interventionReasons);
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
            <TabsList className="mb-6 bg-slate-900/30 dark:bg-white/5 p-1 rounded-lg flex justify-end">
              <TabsTrigger 
                value="analysis" 
                className={`text-sm font-medium ${questionnaireSubmitted ? 'text-primary' : 'text-muted-foreground'}`}
                disabled={!questionnaireSubmitted}
              >
                ניתוח רגשי
              </TabsTrigger>
              <TabsTrigger value="questionnaire" className="text-sm font-medium">שאלון יומי</TabsTrigger>
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
                />
              ) : (
                <div className="text-center p-8">
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
