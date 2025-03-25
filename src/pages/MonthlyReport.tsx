
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Plus, FilePlus, FileText, Table } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const MonthlyReport = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Check if file is CSV or Excel
      const fileType = file.type;
      if (
        fileType === 'text/csv' ||
        fileType === 'application/vnd.ms-excel' ||
        fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        setSelectedFile(file);
      } else {
        toast({
          title: "סוג קובץ לא נתמך",
          description: "יש להעלות רק קבצי CSV או Excel",
          variant: "destructive",
        });
        e.target.value = '';
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      setIsUploading(false);
      toast({
        title: "הקובץ הועלה בהצלחה",
        description: `'${selectedFile.name}' נוסף לדוח החודשי שלך`,
      });
      setSelectedFile(null);
    }, 1500);
  };

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <h1 className="text-3xl font-bold mb-6">דוח חודשי</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>העלאת נתוני מסחר</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    העלה קובץ CSV או Excel המכיל את נתוני המסחר שלך. הקובץ צריך לכלול עמודות לתאריך, סימול, כמות, מחיר כניסה, מחיר יציאה, וסוג עסקה (קנייה/מכירה).
                  </p>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="mb-4">
                      <Upload className="h-10 w-10 mx-auto text-gray-400" />
                    </div>
                    <p className="text-lg font-medium mb-2">גרור ושחרר קובץ CSV או Excel</p>
                    <p className="text-sm text-gray-500 mb-4">או</p>
                    
                    <div className="flex justify-center">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <Button variant="outline" className="gap-2">
                          <FilePlus size={16} />
                          בחר קובץ
                        </Button>
                        <Input 
                          id="file-upload" 
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </Label>
                    </div>
                    
                    {selectedFile && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-md">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div className="flex-1 text-start">
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                          </div>
                          <Button 
                            onClick={handleUpload} 
                            disabled={isUploading}
                          >
                            {isUploading ? 'מעלה...' : 'העלה'}
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
                            <Label htmlFor="symbol">סימול</Label>
                            <Input id="symbol" placeholder="לדוגמה: AAPL" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="date">תאריך</Label>
                            <Input id="date" type="date" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="action">פעולה</Label>
                            <select id="action" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
                              <option value="buy">קנייה</option>
                              <option value="sell">מכירה</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="quantity">כמות</Label>
                            <Input id="quantity" type="number" placeholder="100" />
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
                        
                        <div className="space-y-2">
                          <Label htmlFor="notes">הערות</Label>
                          <textarea 
                            id="notes" 
                            rows={3}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="הערות נוספות לגבי העסקה..."
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={() => toast({ title: "העסקה נשמרה בהצלחה" })}>שמור עסקה</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
            
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
          </div>
          
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>סטטיסטיקת הדוח</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">סך עסקאות:</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">רווח/הפסד:</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">אחוז ניצחון:</span>
                    <span className="font-medium">0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">אחוז הפסד:</span>
                    <span className="font-medium">0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">יחס סיכוי/סיכון:</span>
                    <span className="font-medium">0:0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">מסחר הטוב ביותר:</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">מסחר הגרוע ביותר:</span>
                    <span className="font-medium">$0.00</span>
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
