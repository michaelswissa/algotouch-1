
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TradeJournalHeader from '@/components/trade-journal/TradeJournalHeader';
import TradeNotes from '@/components/trade-journal/TradeNotes';
import ModernTraderQuestionnaire from '@/components/trade-journal/ModernTraderQuestionnaire';
import TradingReport from '@/components/trade-journal/TradingReport';
import { useToast } from '@/hooks/use-toast';
import { FormattedData } from '@/components/trade-journal/questionnaire/schema';

interface ReportData extends FormattedData {
  id: number;
}

const TradeJournalPage = () => {
  const [activeTab, setActiveTab] = useState('questionnaire');
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [savedReports, setSavedReports] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Load saved reports from localStorage on component mount
  useEffect(() => {
    try {
      setIsLoading(true);
      const storedReports = localStorage.getItem('tradingReports');
      if (storedReports) {
        setSavedReports(JSON.parse(storedReports));
      }
    } catch (error) {
      console.error('Error parsing stored reports:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת הדוחות השמורים",
        description: "לא ניתן היה לטעון את ההיסטוריה של הדוחות שלך",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const handleNewNote = () => {
    // Future functionality for creating a new note
  };

  const handleDeleteNote = (noteId: number) => {
    // Filter out the note with the given ID
    const updatedReports = savedReports.filter(report => report.id !== noteId);
    
    // Update state
    setSavedReports(updatedReports);
    
    // Update localStorage
    localStorage.setItem('tradingReports', JSON.stringify(updatedReports));
    
    // If the deleted note is the current report being viewed, reset the report view
    if (reportData && reportData.id === noteId) {
      setReportData(null);
      setQuestionnaireSubmitted(false);
      setActiveTab('questionnaire');
    }
  };

  const handleQuestionnaireSubmit = async (data: FormattedData) => {
    setIsLoading(true);
    
    try {
      console.log('Form data:', data);
      
      // Create a new report with unique ID
      const newReport: ReportData = {
        ...data,
        id: Date.now(), // Use timestamp as ID
      };
      
      // Small delay to simulate processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setReportData(newReport);
      setQuestionnaireSubmitted(true);
      setActiveTab('report');
      
      // Save the new report to savedReports
      const updatedReports = [newReport, ...savedReports];
      setSavedReports(updatedReports);
      
      // Store updated reports in localStorage
      localStorage.setItem('tradingReports', JSON.stringify(updatedReports));
    } catch (error) {
      console.error('Error handling questionnaire submission:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת הדוח",
        description: "לא ניתן היה לשמור את הדוח שלך. נסה שוב מאוחר יותר.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tradervue-container py-6" dir="rtl">
      <TradeJournalHeader onNewNote={handleNewNote} />
      
      {/* Horizontal scrollable notes section - showing saved reports */}
      <TradeNotes 
        notes={savedReports} 
        onDeleteNote={handleDeleteNote}
      />
      
      {/* Main content area with tabs */}
      <div className="space-y-6 animate-fade-in mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <ModernTraderQuestionnaire 
              onSubmit={handleQuestionnaireSubmit} 
              isLoading={isLoading}
            />
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
  );
};

export default TradeJournalPage;
