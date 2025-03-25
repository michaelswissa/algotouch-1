
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Folder } from 'lucide-react';

const NotebookPage = () => {
  const categories = [
    {
      name: 'אסטרטגיות מסחר',
      notes: [
        { title: 'אסטרטגיית Gap and Go', date: '15 מאי, 2024' },
        { title: 'משחק באונס VWAP', date: '28 אפריל, 2024' },
        { title: 'אסטרטגיית פריצה', date: '20 מרץ, 2024' },
      ]
    },
    {
      name: 'ניתוח שוק',
      notes: [
        { title: 'ניתוח שבועי של SPY', date: '10 יוני, 2024' },
        { title: 'הערות על רוטציית מגזרים', date: '30 מאי, 2024' },
      ]
    },
    {
      name: 'סקירות עסקאות',
      notes: [
        { title: 'עסקת AAPL - יוני 2024', date: '5 יוני, 2024' },
        { title: 'התקנה שנכשלה ב-TSLA', date: '22 מאי, 2024' },
        { title: 'משחק הרווחים של MSFT', date: '26 אפריל, 2024' },
        { title: 'עסקת מומנטום ב-AMD', date: '15 אפריל, 2024' },
      ]
    }
  ];

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">מחברת</h1>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Folder size={16} />
              תיקייה חדשה
            </Button>
            <Button className="gap-2">
              <Plus size={16} />
              פתק חדש
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {categories.map((category, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-3">
                <Folder size={18} className="text-gray-500" />
                <h2 className="text-lg font-medium">{category.name}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.notes.map((note, j) => (
                  <Card key={j} className="hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start gap-2">
                        <FileText size={18} className="text-gray-500 mt-0.5" />
                        <div>
                          <CardTitle className="text-base font-medium">{note.title}</CardTitle>
                          <p className="text-xs text-gray-500 mt-1">{note.date}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        הערות על {note.title.toLowerCase()} כולל רמות מפתח, קריטריונים לכניסה ויציאה,
                        ותובנות חשובות מעסקאות קודמות.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default NotebookPage;
