
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import TradeFilters from '@/components/TradeFilters';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import TradeList from '@/components/TradeList';
import EmotionalTracker from '@/components/EmotionalTracker';
import { Filter, LineChart, Plus, Search, FileText, ScrollText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock notes data for the horizontal scrollable section
const tradeNotes = [
  {
    id: 1,
    title: 'אסטרטגיית Gap and Go',
    date: '15 יוני, 2024',
    tags: ['אסטרטגיה', 'פתיחת שוק'],
    excerpt: 'הערות על אסטרטגיית gap and go כולל רמות מפתח וקריטריונים לכניסה.'
  },
  {
    id: 2,
    title: 'משחק באונס VWAP',
    date: '28 מאי, 2024',
    tags: ['אסטרטגיה', 'אינדיקטור'],
    excerpt: 'ניתוח של משחק באונס VWAP עם דוגמאות מעסקאות מוצלחות.'
  },
  {
    id: 3,
    title: 'ניתוח שבועי של SPY',
    date: '10 יוני, 2024',
    tags: ['מדדים', 'טווח ארוך'],
    excerpt: 'סקירה שבועית של ה-SPY וההשלכות על אסטרטגיית המסחר.'
  },
  {
    id: 4,
    title: 'עסקת AAPL - יוני 2024',
    date: '5 יוני, 2024',
    tags: ['טכנולוגיה', 'מניות'],
    excerpt: 'ניתוח מקיף של העסקה ב-AAPL כולל נקודות כניסה ויציאה.'
  },
  {
    id: 5,
    title: 'התקנה שנכשלה ב-TSLA',
    date: '22 מאי, 2024',
    tags: ['רכב חשמלי', 'לקחים'],
    excerpt: 'ניתוח של הפסד ב-TSLA ולקחים למסחר בעתיד.'
  },
  {
    id: 6,
    title: 'אסטרטגיית פריצה',
    date: '20 מרץ, 2024',
    tags: ['אסטרטגיה', 'מומנטום'],
    excerpt: 'פירוט של אסטרטגיית פריצה וכיצד לזהות הזדמנויות.'
  }
];

const TradeJournalPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trades');

  const handleNewTrade = () => {
    navigate('/new-trade');
  };

  const handleNewNote = () => {
    // Future functionality for creating a new note
  };

  const handleMonthlyReport = () => {
    navigate('/monthly-report');
  };

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ScrollText size={24} />
            </span>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">יומן עסקאות</span>
          </h1>
          
          <div className="flex gap-3 items-center">
            <div className="relative max-w-xs">
              <Input 
                placeholder="חיפוש עסקאות..." 
                className="pl-9 pr-4 py-2 h-9 rounded-lg bg-white/80 dark:bg-white/5"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground/70" />
            </div>
            
            <Button variant="outline" size="sm" className="gap-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-300">
              <Filter size={14} />
              <span>סינון</span>
            </Button>
            
            <Button 
              onClick={handleNewNote}
              variant="outline"
              size="sm" 
              className="gap-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-300"
            >
              <FileText size={14} />
              <span>פתק חדש</span>
            </Button>
            
            <Button 
              onClick={handleMonthlyReport}
              variant="outline"
              size="sm" 
              className="gap-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-300"
            >
              <FileSpreadsheet size={14} />
              <span>דוח חודשי</span>
            </Button>
            
            <Button 
              onClick={handleNewTrade}
              size="sm" 
              className="gap-2 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-sm"
            >
              <Plus size={14} />
              <span>עסקה חדשה</span>
            </Button>
          </div>
        </div>
        
        {/* Horizontal scrollable notes section - Fixed for RTL */}
        <div className="mb-8 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <span>פתקים והערות</span>
            </h2>
          </div>
          
          <ScrollArea className="w-full" dir="rtl">
            <div className="flex space-x-reverse space-x-4 pb-4 rtl">
              {tradeNotes.map((note) => (
                <Card key={note.id} className="inline-block w-[300px] shrink-0 hover-scale hover-glow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <FileText size={16} className="text-primary mt-0.5" />
                      <div className="rtl text-right">
                        <h3 className="font-medium whitespace-normal">{note.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{note.date}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-normal line-clamp-2 mb-3 text-right">
                      {note.excerpt}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2 justify-end">
                      {note.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="bg-secondary/30 border-border/50 text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Main content area with tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-white/50 dark:bg-white/5 p-1 rounded-lg">
            <TabsTrigger value="trades" className="text-sm font-medium">עסקאות</TabsTrigger>
            <TabsTrigger value="emotional" className="text-sm font-medium">ניתוח רגשי</TabsTrigger>
            <TabsTrigger value="patterns" className="text-sm font-medium">דפוסי התנהגות</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trades" className="space-y-6">
            <div className="mb-6 animate-fade-in bg-white/50 dark:bg-white/5 p-4 rounded-xl border border-white/30 dark:border-white/5 shadow-sm backdrop-blur-sm">
              <TradeFilters />
            </div>
            
            <div className="mb-6 animate-fade-in glass-card-2025 p-4 rounded-xl">
              <PerformanceMetrics />
            </div>
            
            <div className="animate-fade-in bg-white/50 dark:bg-white/5 p-4 rounded-xl border border-white/30 dark:border-white/5 shadow-sm backdrop-blur-sm">
              <TradeList />
            </div>
          </TabsContent>
          
          <TabsContent value="emotional" className="space-y-6">
            <EmotionalTracker />
          </TabsContent>
          
          <TabsContent value="patterns" className="space-y-6">
            <div className="bg-white/50 dark:bg-white/5 p-6 rounded-xl border border-white/30 dark:border-white/5 shadow-sm backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 text-right">דפוסי התנהגות במסחר</h2>
              <div className="text-right">
                <p className="text-muted-foreground mb-6">תצוגה זו תציג דפוסי התנהגות מזוהים במסחר שלך לאורך זמן, כולל הרגלים חוזרים, הטיות רגשיות, ואזורי שיפור פוטנציאליים.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium mb-3">דפוסים חוזרים</h3>
                      <p className="text-sm text-muted-foreground mb-4">המערכת זיהתה את הדפוסים הבאים בהתנהגות המסחר שלך:</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          <span>נטייה לסגירה מוקדמת של עסקאות רווחיות (ב-75% מהמקרים)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                          <span>החזקת עסקאות מפסידות זמן רב מדי (ב-62% מהמקרים)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          <span>ביצועים משופרים בימי שלישי ורביעי (רווחיות גבוהה ב-32%)</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium mb-3">הטיות רגשיות</h3>
                      <p className="text-sm text-muted-foreground mb-4">הטיות רגשיות שזוהו במסחר שלך:</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          <span>הטיית אישור - חיפוש מידע התומך בהחלטות קיימות</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                          <span>הטיית רמיזה - נטייה לעשות יותר מדי עסקאות אחרי רווח משמעותי</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                          <span>הטיית הפסד - לקיחת סיכונים גדולים יותר אחרי הפסדים</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                <h3 className="text-lg font-semibold mb-4">המלצות לשיפור</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">הגדר כללי יציאה ברורים</h4>
                      <p className="text-sm">קבע מראש נקודות יציאה לכל עסקה והקפד לציית להן ללא קשר לרגשות.</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/30">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">נהל יומן רגשות יומי</h4>
                      <p className="text-sm">הקדש 5 דקות בסוף כל יום מסחר לרשום את הרגשות שחווית והשפעתם על החלטותיך.</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/30">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">קח הפסקות יזומות</h4>
                      <p className="text-sm">נסה להכניס 3 הפסקות קצרות במהלך יום המסחר כדי לרענן את החשיבה ולהפחית לחץ.</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default TradeJournalPage;
