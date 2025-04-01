import React, { useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Plus, FilePlus, FileText, Table, BarChart, FileSpreadsheet, FileUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { parseCSVFile, calculateTradeStats, TradeRecord, TradeStats } from '@/lib/trade-analysis';
import TradeDataTable from '@/components/TradeDataTable';
import TradeCharts from '@/components/TradeCharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MonthlyReport = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [activeTab, setActiveTab] = useState('table');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const fileType = file.type;
      const validType = 
        fileType === 'text/csv' ||
        fileType === 'application/vnd.ms-excel' ||
        fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls');
        
      if (validType) {
        setSelectedFile(file);
        try {
          await handleUpload(file);
        } catch (error) {
          console.error("Error processing file:", error);
          toast({
            title: "שגיאה בטעינת הקובץ",
            description: "אירעה שגיאה בעיבוד הקובץ. אנא ודא שהקובץ בפורמט הנכון.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "סוג קובץ לא נתמך",
          description: "יש להעלות רק קבצי CSV או Excel",
          variant: "destructive",
        });
        if (e.target) {
          e.target.value = '';
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const fileType = file.type;
      const validType = 
        fileType === 'text/csv' ||
        fileType === 'application/vnd.ms-excel' ||
        fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls');
        
      if (validType) {
        setSelectedFile(file);
        try {
          await handleUpload(file);
        } catch (error) {
          console.error("Error processing dragged file:", error);
          toast({
            title: "שגיאה בטעינת הקובץ",
            description: "אירעה שגיאה בעיבוד הקובץ. אנא ודא שהקובץ בפורמט הנכון.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "סוג קובץ לא נתמך",
          description: "יש להעלות רק קבצי CSV או Excel",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const tradeData = await parseCSVFile(file);
      
      if (tradeData.length === 0) {
        toast({
          title: "אין נתונים בקובץ",
          description: "הקובץ ריק או שפורמט הנתונים אינו תואם למבנה הנדרש.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      
      const tradeStats = calculateTradeStats(tradeData);
      
      setTrades(tradeData);
      setStats(tradeStats);
      
      toast({
        title: "הקובץ הועלה בהצלחה",
        description: `'${file.name}' נוסף לדוח החודשי שלך`,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "שגיאה בעיבוד הקובץ",
        description: "אירעה שגיאה בעיבוד הקובץ. אנא ודא שהקובץ בפורמט הנכון.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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
            <Card className="mb-6 hover-glow">
              <CardHeader>
                <CardTitle>העלאת נתוני מסחר</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    העלה קובץ CSV או Excel המכיל את נתוני המסחר שלך. הקובץ צריך לכלול עמודות עבור מספר חשבון, חוזה, שם סיגנל, כיוון, תאריכי כניסה ויציאה, מחירים, רווח/הפסד ונטו.
                  </p>
                  
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors duration-200 hover:border-primary/50 cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={handleFileClick}
                  >
                    <input 
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    
                    <div className="mb-4">
                      <Upload className="h-10 w-10 mx-auto text-gray-400" />
                    </div>
                    <p className="text-lg font-medium mb-2">גרור ושחרר קובץ CSV או Excel</p>
                    <p className="text-sm text-gray-500 mb-4">או</p>
                    
                    <div className="flex justify-center">
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileClick();
                        }}
                      >
                        <FileUp size={16} />
                        בחר קובץ
                      </Button>
                    </div>
                    
                    {selectedFile && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-md dark:bg-blue-950/30">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div className="flex-1 text-start">
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                          </div>
                          <Button 
                            disabled={isUploading}
                            variant="secondary"
                          >
                            {isUploading ? 'מעלה...' : 'הועלה בהצלחה'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center border-t pt-4">
                  <p className="text-sm text-gray-500">או</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Plus size={16} />
                        הוסף עסקה ידנית
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[520px]">
                      <DialogHeader>
                        <DialogTitle>הוספת עסקה חדשה</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="contract">קונטרקט</Label>
                            <Input id="contract" placeholder="לדוגמה: AAPL" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signalName">שם סיגנל</Label>
                            <Input id="signalName" placeholder="לדוגמה: Breakout" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="side">כיוון</Label>
                            <select id="side" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
                              <option value="Long">לונג</option>
                              <option value="Short">שורט</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accountNumber">מספר חשבון</Label>
                            <Input id="accountNumber" placeholder="לדוגמה: 12345" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="entryDateTime">תאריך ושעת כניסה</Label>
                            <Input id="entryDateTime" type="datetime-local" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="exitDateTime">תאריך ושעת יציאה</Label>
                            <Input id="exitDateTime" type="datetime-local" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="entryPrice">מחיר כניסה</Label>
                            <Input id="entryPrice" type="number" step="0.01" placeholder="150.25" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="exitPrice">מחיר יציאה</Label>
                            <Input id="exitPrice" type="number" step="0.01" placeholder="155.50" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="profitLoss">רווח/הפסד</Label>
                            <Input id="profitLoss" type="number" step="0.01" placeholder="525.00" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="net">נטו</Label>
                            <Input id="net" type="number" step="0.01" placeholder="500.00" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="equity">הון</Label>
                          <Input id="equity" type="number" step="0.01" placeholder="10000.00" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleAddManualTrade}>שמור עסקה</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
            
            {trades.length > 0 ? (
              <Card className="glass-card-2025">
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Table className="h-5 w-5 text-primary" />
                      <span>נתוני עסקאות</span>
                    </CardTitle>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList>
                        <TabsTrigger value="table">טבלה</TabsTrigger>
                        <TabsTrigger value="charts">גרפים</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-4">
                    {activeTab === 'table' && <TradeDataTable trades={trades} />}
                    {activeTab === 'charts' && stats && <TradeCharts trades={trades} stats={stats} />}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>עסקאות אחרונות</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center p-8 text-center">
                    <div>
                      <Table className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium mb-2">אין עסקאות להצגה</h3>
                      <p className="text-sm text-gray-500">
                        העלה קובץ CSV או הוסף עסקה ידנית כדי לראות את העסקאות שלך כאן.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="lg:col-span-1">
            <Card className="hover-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-primary" />
                  <span>סטטיסטיקת הדוח</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">סך עסקאות:</span>
                    <span className="font-medium">{stats?.totalTrades || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">רווח/הפסד:</span>
                    <span className={`font-medium ${stats?.profitLoss && stats.profitLoss >= 0 ? 'text-tradervue-green' : 'text-tradervue-red'}`}>
                      {stats?.profitLoss ? (stats.profitLoss >= 0 ? `$${stats.profitLoss.toFixed(2)}` : `-$${Math.abs(stats.profitLoss).toFixed(2)}`) : '$0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">נטו:</span>
                    <span className={`font-medium ${stats?.netProfit && stats.netProfit >= 0 ? 'text-tradervue-green' : 'text-tradervue-red'}`}>
                      {stats?.netProfit ? (stats.netProfit >= 0 ? `$${stats.netProfit.toFixed(2)}` : `-$${Math.abs(stats.netProfit).toFixed(2)}`) : '$0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">אחוז ניצחון:</span>
                    <span className="font-medium">{stats?.winRate ? `${stats.winRate.toFixed(2)}%` : '0%'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">אחוז הפסד:</span>
                    <span className="font-medium">{stats?.lossRate ? `${stats.lossRate.toFixed(2)}%` : '0%'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">יחס סיכוי/סיכון:</span>
                    <span className="font-medium">{stats?.riskRewardRatio || '0:0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">העסקה הכי רווחית:</span>
                    <span className="font-medium text-tradervue-green">
                      {stats?.bestTrade ? `$${stats.bestTrade.toFixed(2)}` : '$0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">העסקה הכי מפסידה:</span>
                    <span className="font-medium text-tradervue-red">
                      {stats?.worstTrade ? `-$${Math.abs(stats.worstTrade).toFixed(2)}` : '$0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">עסקאות לונג:</span>
                    <span className="font-medium">{stats?.longTrades || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">עסקאות שורט:</span>
                    <span className="font-medium">{stats?.shortTrades || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MonthlyReport;
