
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { enhancedEmotions } from '../data/enhanced-emotions';
import { psychologicalPatterns } from '../data/psychological-patterns';

// Mock data for questionnaire responses
const mockResponses = [
  {
    date: '2025-03-30',
    preEmotion: 'confidence',
    postEmotion: 'satisfaction',
    tradingDayRating: 'positive',
    followedPlan: 'mostly',
    detectedPatterns: ['perfectionism'],
    behaviorConcerns: ['סיכון מוגבר בשל ביטחון יתר'],
    focusArea: 'משמעת במסחר'
  },
  {
    date: '2025-03-29',
    preEmotion: 'anxiety',
    postEmotion: 'frustration',
    tradingDayRating: 'negative',
    followedPlan: 'partially',
    detectedPatterns: ['revenge-trading', 'loss-aversion'],
    behaviorConcerns: ['קושי לקבל הפסדים', 'נטייה למסחר נקמה'],
    focusArea: 'ניהול הפסדים'
  },
  {
    date: '2025-03-28',
    preEmotion: 'doubt',
    postEmotion: 'confidence',
    tradingDayRating: 'positive',
    followedPlan: 'completely',
    detectedPatterns: ['analysis-paralysis'],
    behaviorConcerns: ['שיתוק אנליטי'],
    focusArea: 'קבלת החלטות'
  },
  {
    date: '2025-03-27',
    preEmotion: 'patience',
    postEmotion: 'satisfaction',
    tradingDayRating: 'very-positive',
    followedPlan: 'completely',
    detectedPatterns: [],
    behaviorConcerns: [],
    focusArea: 'שיפור מתמיד'
  },
  {
    date: '2025-03-26',
    preEmotion: 'impatience',
    postEmotion: 'frustration',
    tradingDayRating: 'neutral',
    followedPlan: 'rarely',
    detectedPatterns: ['overtrading', 'fomo-trading'],
    behaviorConcerns: ['מסחר יתר', 'FOMO - פחד מהחמצה'],
    focusArea: 'איכות מול כמות'
  }
];

const QuestionnaireHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState('responses');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Get emotion label by ID
  const getEmotionLabel = (id: string) => {
    const emotion = enhancedEmotions.find(e => e.id === id);
    return emotion ? emotion.label : id;
  };
  
  // Get pattern name by ID
  const getPatternName = (id: string) => {
    const pattern = psychologicalPatterns.find(p => p.id === id);
    return pattern ? pattern.name : id;
  };
  
  // Get rating label
  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case 'very-positive': return 'מצוין';
      case 'positive': return 'טוב';
      case 'neutral': return 'סביר';
      case 'negative': return 'גרוע';
      case 'very-negative': return 'גרוע מאוד';
      default: return rating;
    }
  };
  
  // Get plan adherence label
  const getPlanAdherenceLabel = (adherence: string) => {
    switch (adherence) {
      case 'completely': return 'לחלוטין';
      case 'mostly': return 'ברובה';
      case 'partially': return 'חלקית';
      case 'rarely': return 'מעט';
      case 'not-at-all': return 'בכלל לא';
      default: return adherence;
    }
  };
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  // Render response list
  const renderResponseList = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">היסטוריית שאלונים</h3>
        
        {mockResponses.map((response, index) => (
          <Card 
            key={index} 
            className={`hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
              selectedDate === response.date ? 'border-primary' : ''
            }`}
            onClick={() => setSelectedDate(response.date)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{formatDate(response.date)}</h4>
                  <div className="flex items-center mt-1">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      response.tradingDayRating.includes('positive') ? 'bg-green-500' :
                      response.tradingDayRating.includes('negative') ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></span>
                    <span className="text-sm text-muted-foreground">
                      {getRatingLabel(response.tradingDayRating)}
                    </span>
                  </div>
                </div>
                
                <div className="text-left">
                  <div className="text-sm">
                    <span className="text-muted-foreground ml-1">לפני:</span>
                    {getEmotionLabel(response.preEmotion)}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground ml-1">אחרי:</span>
                    {getEmotionLabel(response.postEmotion)}
                  </div>
                </div>
              </div>
              
              {response.detectedPatterns.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {response.detectedPatterns.slice(0, 2).map((pattern, i) => (
                    <span key={i} className="inline-block px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded text-xs">
                      {getPatternName(pattern)}
                    </span>
                  ))}
                  {response.detectedPatterns.length > 2 && (
                    <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs">
                      +{response.detectedPatterns.length - 2}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Render selected response details
  const renderResponseDetails = () => {
    if (!selectedDate) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">בחר שאלון מהרשימה כדי לצפות בפרטים</p>
        </div>
      );
    }
    
    const response = mockResponses.find(r => r.date === selectedDate);
    if (!response) return null;
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{formatDate(response.date)}</h3>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(null)}>
            חזרה לרשימה
          </Button>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">סיכום יומי</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">דירוג יום המסחר</h4>
                <p className="font-medium">{getRatingLabel(response.tradingDayRating)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">עקב אחר תוכנית</h4>
                <p className="font-medium">{getPlanAdherenceLabel(response.followedPlan)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">רגש לפני המסחר</h4>
                <p className="font-medium">{getEmotionLabel(response.preEmotion)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">רגש אחרי המסחר</h4>
                <p className="font-medium">{getEmotionLabel(response.postEmotion)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">ניתוח פסיכולוגי</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {response.detectedPatterns.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">דפוסים שזוהו</h4>
                  <div className="flex flex-wrap gap-2">
                    {response.detectedPatterns.map((pattern, i) => (
                      <span key={i} className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-sm">
                        {getPatternName(pattern)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">דפוסים שזוהו</h4>
                  <p className="text-sm text-green-600 dark:text-green-400">לא זוהו דפוסים בעייתיים</p>
                </div>
              )}
              
              {response.behaviorConcerns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">תחומי דאגה</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {response.behaviorConcerns.map((concern, i) => (
                      <li key={i} className="text-sm">{concern}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">תחום מיקוד מומלץ</h4>
                <p className="text-sm font-medium">{response.focusArea}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  return (
    <Card className="hover-glow rtl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">היסטוריית שאלונים ומעקב</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-slate-900/30 dark:bg-white/5 p-1 rounded-lg w-full flex justify-end">
            <TabsTrigger value="trends" className="text-sm font-medium">מגמות</TabsTrigger>
            <TabsTrigger value="responses" className="text-sm font-medium">שאלונים</TabsTrigger>
          </TabsList>
          
          <TabsContent value="responses" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                {renderResponseList()}
              </div>
              <div className="md:col-span-2">
                {renderResponseDetails()}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-6">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-md text-center">
              <p className="text-muted-foreground">ניתוח מגמות יוצג כאן לאחר צבירת מספיק נתונים</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default QuestionnaireHistory;
