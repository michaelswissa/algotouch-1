
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const MonthlyReport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        toast({
          title: "הקובץ הועלה בהצלחה",
          description: `${selectedFile.name} מוכן לעיבוד`,
        });
      }
    }
  };

  const validateFile = (file: File) => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "סוג קובץ לא נתמך",
        description: "אנא העלה קובץ בפורמט CSV או Excel",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        toast({
          title: "הקובץ הועלה בהצלחה",
          description: `${droppedFile.name} מוכן לעיבוד`,
        });
      }
    }
  };

  const handleManualEntry = () => {
    toast({
      title: "הוספת עסקה ידנית",
      description: "האפשרות להוספת עסקה ידנית תהיה זמינה בקרוב",
    });
  };

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <h1 className="text-3xl font-bold mb-6">דוח חודשי</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>העלאת דוח מסחר</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border-2 border-dashed rounded-lg p-10 text-center ${
                    isDragging ? 'border-[#0299FF] bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">גרור ושחרר קובץ CSV או Excel</h3>
                  <p className="text-gray-500 mb-4">או</p>
                  <label className="relative">
                    <span className="sr-only">Choose file</span>
                    <Input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="hidden"
                      accept=".csv,.xls,.xlsx"
                      onChange={handleFileChange}
                    />
                    <Button asChild>
                      <span>בחר קובץ</span>
                    </Button>
                  </label>
                  
                  {file && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-start">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-[#0299FF] ml-2" />
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">תבניות קובץ נתמכות</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="font-medium mb-1">CSV (ערכים מופרדים בפסיקים)</div>
                        <p className="text-sm text-gray-500">פורמט נפוץ שניתן לייצא מרוב פלטפורמות המסחר</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="font-medium mb-1">Excel (.xls, .xlsx)</div>
                        <p className="text-sm text-gray-500">תבנית גיליון אלקטרוני סטנדרטית</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>אפשרויות נוספות</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleManualEntry} variant="outline" className="w-full justify-start" size="lg">
                  <Plus className="ml-2 h-5 w-5" />
                  <span>הוספת עסקה ידנית</span>
                </Button>
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">דוחות אחרונים</h3>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 border rounded-md hover:bg-gray-50 transition-colors">
                      <FileText className="h-5 w-5 text-gray-400 ml-3" />
                      <div>
                        <div className="font-medium">דוח פברואר 2023</div>
                        <div className="text-xs text-gray-500">הועלה לפני 2 חודשים</div>
                      </div>
                    </div>
                    <div className="flex items-center p-3 border rounded-md hover:bg-gray-50 transition-colors">
                      <FileText className="h-5 w-5 text-gray-400 ml-3" />
                      <div>
                        <div className="font-medium">דוח ינואר 2023</div>
                        <div className="text-xs text-gray-500">הועלה לפני 3 חודשים</div>
                      </div>
                    </div>
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
