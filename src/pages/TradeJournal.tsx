
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TradeJournalHeader from '@/components/trade-journal/TradeJournalHeader';
import TradeNotes from '@/components/trade-journal/TradeNotes';
import ModernTraderQuestionnaire from '@/components/trade-journal/ModernTraderQuestionnaire';
import TradingReport from '@/components/trade-journal/TradingReport';
import { useToast } from '@/hooks/use-toast';

interface ReportData {
  id: number;
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
}

const TradeJournalPage = () => {
  const [activeTab, setActiveTab] = useState('questionnaire');
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [savedReports, setSavedReports] = useState<ReportData[]>([]);
  const { toast } = useToast();
  
  // Load saved reports from localStorage on component mount
  useEffect(() => {
    const storedReports = localStorage.getItem('tradingReports');
    if (storedReports) {
      try {
        setSavedReports(JSON.parse(storedReports));
      } catch (error) {
        console.error('Error parsing stored reports:', error);
      }
    }
  }, []);
  
  const handleNewNote = () => {
    // Future functionality for creating a new note
  };

  const handleQuestionnaireSubmit = async (data: any) => {
    console.log('Form data:', data);
    
    // Create a new report with unique ID
    const newReport: ReportData = {
      ...data,
      id: Date.now(), // Use timestamp as ID
    };
    
    setReportData(newReport);
    setQuestionnaireSubmitted(true);
    setActiveTab('report');
    
    // Save the new report to savedReports
    const updatedReports = [newReport, ...savedReports];
    setSavedReports(updatedReports);
    
    // Store updated reports in localStorage
    localStorage.setItem('tradingReports', JSON.stringify(updatedReports));
    
    toast({
      title: "השאלון נשלח בהצלחה",
      description: "הדוח היומי שלך נוצר ונשמר לתיעוד",
      duration: 3000,
    });
  };

  return (
    <Layout>
      <div className="tradervue-container py-6" dir="rtl">
        <TradeJournalHeader onNewNote={handleNewNote} />
        
        {/* Horizontal scrollable notes section - now shows saved reports */}
        <TradeNotes notes={savedReports} />
        
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
              <ModernTraderQuestionnaire onSubmit={handleQuestionnaireSubmit} />
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
