
import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSVFile, calculateTradeStats, TradeRecord, TradeStats } from '@/lib/trade-analysis';
import TradeUploadCard from '@/components/trade-report/TradeUploadCard';
import TradeReportContent from '@/components/trade-report/TradeReportContent';
import StatsCard from '@/components/trade-report/StatsCard';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useTradingDataStore } from '@/stores/trading-data-store';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MonthlyReport = () => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [activeTab, setActiveTab] = useState('table');
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Get the trading store functions to update global trades
  const { setGlobalTrades, clearAllData, getGlobalTradesCount } = useTradingDataStore();

  const tradeCount = getGlobalTradesCount ? getGlobalTradesCount() : 0;

  const {
    selectedFile,
    isUploading,
    handleFileSelected,
    resetFile
  } = useFileUpload({
    onFileAccepted: async file => {
      try {
        await handleUpload(file);
        setUploadError(null);
      } catch (error: any) {
        console.error("Error processing file:", error);
        setUploadError(error.message || "אירעה שגיאה בעיבוד הקובץ");
        toast({
          title: "שגיאה בטעינת הקובץ",
          description: "אנא ודא שהקובץ בפורמט הנכון.",
          variant: "destructive"
        });
        resetFile();
      }
    }
  });

  const handleUpload = async (file: File) => {
    if (!file) return;
    try {
      console.log("Processing file:", file.name);
      const tradeData = await parseCSVFile(file);
      
      if (tradeData.length === 0) {
        const error = new Error("הקובץ ריק או שפורמט הנתונים אינו תואם למבנה הנדרש");
        setUploadError(error.message);
        toast({
          title: "אין נתונים בקובץ",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }
      
      // First, clear any existing data in the store
      clearAllData();
      
      // Then calculate stats and update local state
      const tradeStats = calculateTradeStats(tradeData);
      setTrades(tradeData);
      setStats(tradeStats);
      
      // Finally, update the global store for calendar use
      console.log("Updating global trades store with", tradeData.length, "trades");
      setGlobalTrades(tradeData);
      
      toast({
        title: "הקובץ הועלה בהצלחה",
        description: `'${file.name}' נוסף לדוח העסקאות שלך והנתונים זמינים גם בלוח השנה`,
      });
    } catch (error: any) {
      console.error("Error processing file:", error);
      throw error;
    }
  };

  const handleAddManualTrade = (formData: any) => {
    // Add validation
    if (!formData?.price || !formData?.date) {
      toast({
        title: "נתונים חסרים",
        description: "יש למלא את כל שדות החובה",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "העסקה נשמרה בהצלחה",
      description: "העסקה החדשה נוספה לרשימת העסקאות שלך"
    });
    
    // Here you would typically add the trade to the state and store
  };

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="text-primary" size={30} />
            <span className="text-gradient-blue">דוח עסקאות</span>
          </h1>
          
          {tradeCount > 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {tradeCount} עסקאות במערכת
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <TradeUploadCard 
              selectedFile={selectedFile} 
              isUploading={isUploading} 
              onFileChange={handleFileSelected} 
              onAddManualTrade={handleAddManualTrade}
              error={uploadError}
            />
            
            <TradeReportContent 
              trades={trades} 
              stats={stats} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />
          </div>
          
          <div className="lg:col-span-1 px-[3px] my-[9px] py-0 mx-0">
            <StatsCard stats={stats} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MonthlyReport;
