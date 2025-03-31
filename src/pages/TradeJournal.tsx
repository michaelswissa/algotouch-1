
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyQuestionnaire from '@/components/trade-journal/DailyQuestionnaire';
import TradeJournalHeader from '@/components/trade-journal/TradeJournalHeader';
import TradeNotes from '@/components/trade-journal/TradeNotes';
import { tradeNotes } from '@/components/trade-journal/mockData';
import TradingReport from '@/components/trade-journal/TradingReport';
import { useToast } from '@/hooks/use-toast';

const TradeJournalPage = () => {
  const [activeTab, setActiveTab] = useState('questionnaire');
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const { toast } = useToast();
  
  const handleNewNote = () => {
    // Future functionality for creating a new note
  };

  const handleQuestionnaireSubmit = async (data: any) => {
    console.log('Form data:', data);
    setReportData(data);
    setQuestionnaireSubmitted(true);
    setActiveTab('report');
    
    toast({
      title: "השאלון נשלח בהצלחה",
      description: "הדוח היומי שלך נוצר ונשמר לתיעוד",
      duration: 3000,
    });

    // Here you would typically save the data to the backend
    // For now, we're just setting it in state
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
                value="report" 
                className={`text-sm font-medium px-4 py-2 ${questionnaireSubmitted ? 'text-primary' : 'text-muted-foreground'}`}
                disabled={!questionnaireSubmitted}
              >
                דוח יומי
              </TabsTrigger>
              <TabsTrigger value="questionnaire" className="text-sm font-medium px-4 py-2">שאלון יומי</TabsTrigger>
            </TabsList>
            
            <TabsContent value="questionnaire" className="space-y-6">
              <DailyQuestionnaire onSubmit={handleQuestionnaireSubmit} />
            </TabsContent>
            
            <TabsContent value="report" className="space-y-6">
              {questionnaireSubmitted && reportData ? (
                <TradingReport data={reportData} />
              ) : (
                <div className="text-center p-8 bg-card rounded-lg shadow-md">
                  <h3 className="text-lg font-medium mb-2">דוח מסחר יומי</h3>
                  <p className="text-muted-foreground">
                    הדוח יוצג כאן לאחר מילוי השאלון היומי. מלא את השאלון היומי כדי לצפות בדוח.
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
