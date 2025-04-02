
import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { FileSpreadsheet } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { parseCSVFile, calculateTradeStats, TradeRecord, TradeStats } from '@/lib/trade-analysis';
import TradeUploadCard from '@/components/trade-report/TradeUploadCard';
import TradeReportContent from '@/components/trade-report/TradeReportContent';
import StatsCard from '@/components/trade-report/StatsCard';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useTradingDataStore } from '@/stores/trading-data-store';

const MonthlyReport = () => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [activeTab, setActiveTab] = useState('table');
  const { toast } = useToast();
  
  // Get the trading store functions to update global trades
  const { setGlobalTrades, clearAllData } = useTradingDataStore();

  const {
    selectedFile,
    isUploading,
    handleFileSelected,
    resetFile
  } = useFileUpload({
    onFileAccepted: async file => {
      try {
        await handleUpload(file);
      } catch (error) {
        console.error("Error processing file:", error);
        toast({
          title: "שגיאה בטעינת הקובץ",
          description: "אירעה שגיאה בעיבוד הקובץ. אנא ודא שהקובץ בפורמט הנכון.",
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
        toast({
          title: "אין נתונים בקובץ",
          description: "הקובץ ריק או שפורמט הנתונים אינו תואם למבנה הנדרש.",
          variant: "destructive"
        });
        return;
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
    } catch (error) {
      console.error("Error processing file:", error);
      throw error;
    }
  };

  const handleAddManualTrade = (formData: any) => {
    toast({
      title: "העסקה נשמרה בהצלחה",
      description: "העסקה החדשה נוספה לרשימת העסקאות שלך"
    });
  };

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <FileSpreadsheet className="text-primary" size={30} />
          <span className="text-gradient-blue">דוח עסקאות</span>
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <TradeUploadCard selectedFile={selectedFile} isUploading={isUploading} onFileChange={handleFileSelected} onAddManualTrade={handleAddManualTrade} />
            
            <TradeReportContent trades={trades} stats={stats} activeTab={activeTab} setActiveTab={setActiveTab} />
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
