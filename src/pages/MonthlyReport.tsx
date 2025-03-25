
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUp, Plus, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

const MonthlyReport = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-6">דוח חודשי</h1>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>יצירת דוח חודשי</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload">
              <TabsList className="mb-6">
                <TabsTrigger value="upload">העלאת קובץ</TabsTrigger>
                <TabsTrigger value="manual">הזנה ידנית</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-6">
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center mb-6">
                  <FileUp className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">העלה קובץ CSV או Excel</h3>
                  <p className="text-gray-500 mb-4">גרור לכאן או לחץ לבחירת קובץ</p>
                  
                  <div className="relative">
                    <Input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                    />
                    <Button variant="outline" className="relative z-10">
                      בחר קובץ
                    </Button>
                  </div>
                  
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      <span>{selectedFile.name}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center border-t border-gray-200 pt-6">
                  <p className="text-sm text-gray-500">
                    פורמטים נתמכים: CSV, Excel (.xlsx, .xls)
                  </p>
                  <Button disabled={!selectedFile}>
                    העלה ויצור דוח
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="manual" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="month">חודש</Label>
                    <Input id="month" type="month" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="profitLoss">רווח / הפסד כולל</Label>
                    <Input id="profitLoss" placeholder="0.00" type="number" step="0.01" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totalTrades">סה"כ עסקאות</Label>
                    <Input id="totalTrades" placeholder="0" type="number" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="winRate">אחוז עסקאות רווחיות</Label>
                    <Input id="winRate" placeholder="0" type="number" max="100" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bestTrade">עסקה טובה ביותר</Label>
                    <Input id="bestTrade" placeholder="0.00" type="number" step="0.01" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="worstTrade">עסקה גרועה ביותר</Label>
                    <Input id="worstTrade" placeholder="0.00" type="number" step="0.01" />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
                  <Button variant="outline">ביטול</Button>
                  <Button>שמור דוח</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MonthlyReport;
