
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Folder, Star, Tag } from 'lucide-react';

const NotebookPage = () => {
  const categories = [
    {
      name: 'אסטרטגיות מסחר',
      icon: <Star size={16} className="text-yellow-500" />,
      notes: [
        { title: 'אסטרטגיית Gap and Go', date: '15 מאי, 2024', tags: ['אסטרטגיה', 'פתיחת שוק'] },
        { title: 'משחק באונס VWAP', date: '28 אפריל, 2024', tags: ['אסטרטגיה', 'אינדיקטור'] },
        { title: 'אסטרטגיית פריצה', date: '20 מרץ, 2024', tags: ['אסטרטגיה', 'מומנטום'] },
      ]
    },
    {
      name: 'ניתוח שוק',
      icon: <Tag size={16} className="text-blue-500" />,
      notes: [
        { title: 'ניתוח שבועי של SPY', date: '10 יוני, 2024', tags: ['מדדים', 'טווח ארוך'] },
        { title: 'הערות על רוטציית מגזרים', date: '30 מאי, 2024', tags: ['מגזרים', 'מגמות'] },
      ]
    },
    {
      name: 'סקירות עסקאות',
      icon: <FileText size={16} className="text-green-500" />,
      notes: [
        { title: 'עסקת AAPL - יוני 2024', date: '5 יוני, 2024', tags: ['טכנולוגיה', 'מניות'] },
        { title: 'התקנה שנכשלה ב-TSLA', date: '22 מאי, 2024', tags: ['רכב חשמלי', 'לקחים'] },
        { title: 'משחק הרווחים של MSFT', date: '26 אפריל, 2024', tags: ['דוחות', 'אירועים'] },
        { title: 'עסקת מומנטום ב-AMD', date: '15 אפריל, 2024', tags: ['שבבים', 'מומנטום'] },
      ]
    }
  ];

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText size={28} className="text-primary" />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">מחברת</span>
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 transition-all duration-300 hover:border-primary">
              <Folder size={16} />
              תיקייה חדשה
            </Button>
            <Button className="gap-2 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105">
              <Plus size={16} />
              פתק חדש
            </Button>
          </div>
        </div>

        <div className="space-y-10">
          {categories.map((category, i) => (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-full bg-secondary">{category.icon}</div>
                <h2 className="text-lg font-semibold">{category.name}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.notes.map((note, j) => (
                  <Card key={j} className="hover-scale hover-glow">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start gap-2">
                        <FileText size={18} className="text-primary mt-0.5" />
                        <div>
                          <CardTitle className="text-base font-medium">{note.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">{note.date}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        הערות על {note.title.toLowerCase()} כולל רמות מפתח, קריטריונים לכניסה ויציאה,
                        ותובנות חשובות מעסקאות קודמות.
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.map((tag, k) => (
                          <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
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
