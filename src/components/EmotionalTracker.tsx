import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart as LineChartIcon, BarChart as BarChartIcon, PieChart as PieChartIcon, TrendingUp, TrendingDown, Lightbulb, Info } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// Mock data for the emotional charts
const emotionTrendData = [
  { date: '01/06', confidence: 70, fear: 30, greed: 40, frustration: 20, doubt: 45 },
  { date: '02/06', confidence: 65, fear: 35, greed: 30, frustration: 25, doubt: 50 },
  { date: '03/06', confidence: 60, fear: 45, greed: 35, frustration: 40, doubt: 55 },
  { date: '04/06', confidence: 75, fear: 25, greed: 20, frustration: 15, doubt: 30 },
  { date: '05/06', confidence: 80, fear: 20, greed: 15, frustration: 10, doubt: 25 },
  { date: '06/06', confidence: 65, fear: 40, greed: 30, frustration: 35, doubt: 45 },
  { date: '07/06', confidence: 60, fear: 50, greed: 25, frustration: 45, doubt: 60 },
  { date: '08/06', confidence: 70, fear: 30, greed: 20, frustration: 25, doubt: 35 },
  { date: '09/06', confidence: 85, fear: 15, greed: 10, frustration: 5, doubt: 20 },
  { date: '10/06', confidence: 75, fear: 25, greed: 30, frustration: 20, doubt: 40 },
];

const emotionPerformanceData = [
  { name: 'ביטחון', value: 78, fill: '#4ade80' },
  { name: 'פחד', value: 32, fill: '#f87171' },
  { name: 'חמדנות', value: 45, fill: '#fb923c' },
  { name: 'תסכול', value: 28, fill: '#a855f7' },
  { name: 'ספק', value: 52, fill: '#60a5fa' },
];

const tradeOutcomeData = [
  { name: 'ביטחון', profit: 75, loss: 25 },
  { name: 'פחד', profit: 40, loss: 60 },
  { name: 'חמדנות', profit: 30, loss: 70 },
  { name: 'תסכול', profit: 25, loss: 75 },
  { name: 'ספק', profit: 45, loss: 55 },
];

// Mock recent trades for emotion tracking
const recentTrades = [
  { id: 1, symbol: 'AAPL', date: '12 יוני, 2024', result: 'רווח', amount: '+₪542.30' },
  { id: 2, symbol: 'TSLA', date: '10 יוני, 2024', result: 'הפסד', amount: '-₪246.75' },
  { id: 3, symbol: 'AMZN', date: '09 יוני, 2024', result: 'רווח', amount: '+₪318.20' },
  { id: 4, symbol: 'MSFT', date: '07 יוני, 2024', result: 'רווח', amount: '+₪187.45' },
];

const EmotionalTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState('track');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [preTradeEmotion, setPreTradeEmotion] = useState('');
  const [postTradeEmotion, setPostTradeEmotion] = useState('');
  const [tradeJournalText, setTradeJournalText] = useState('');
  
  const emotions = [
    { id: 'confidence', label: 'ביטחון', color: 'bg-green-500' },
    { id: 'doubt', label: 'ספק', color: 'bg-blue-500' },
    { id: 'fear', label: 'פחד', color: 'bg-red-500' },
    { id: 'greed', label: 'חמדנות', color: 'bg-orange-500' },
    { id: 'frustration', label: 'תסכול', color: 'bg-purple-500' },
  ];

  return (
    <div className="w-full space-y-6" dir="rtl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-white/50 dark:bg-white/5 p-1 rounded-lg w-full justify-start">
          <TabsTrigger value="track" className="text-sm font-medium">מעקב רגשי</TabsTrigger>
          <TabsTrigger value="analysis" className="text-sm font-medium">ניתוח נתונים</TabsTrigger>
          <TabsTrigger value="insights" className="text-sm font-medium">תובנות</TabsTrigger>
        </TabsList>
        
        <TabsContent value="track" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Emotional Check-in */}
            <Card className="hover-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">מעקב רגשי יומי</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-4">איך אתה מרגיש היום לפני תחילת המסחר?</p>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {emotions.map((emotion) => (
                      <Button
                        key={emotion.id}
                        variant={selectedEmotion === emotion.id ? "default" : "outline"}
                        className={`${selectedEmotion === emotion.id ? emotion.color + ' text-white' : ''} flex-1 min-w-24`}
                        onClick={() => setSelectedEmotion(emotion.id)}
                      >
                        {emotion.label}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="pt-4">
                    <Label htmlFor="emotionNotes" className="block mb-2">הערות נוספות</Label>
                    <Textarea
                      id="emotionNotes"
                      placeholder="תאר את מצב הרוח והרגשות שלך בצורה חופשית..."
                      className="h-24"
                    />
                  </div>
                  
                  <Button className="w-full mt-2 bg-primary">שמור מעקב יומי</Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Per-Trade Emotion Tracking */}
            <Card className="hover-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">מעקב רגשי בעסקאות</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="block mb-2">בחר עסקה לתיעוד</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר עסקה אחרונה" />
                      </SelectTrigger>
                      <SelectContent>
                        {recentTrades.map((trade) => (
                          <SelectItem key={trade.id} value={trade.id.toString()}>
                            {trade.symbol} - {trade.date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="block mb-1">רגש לפני העסקה</Label>
                    <RadioGroup value={preTradeEmotion} onValueChange={setPreTradeEmotion} className="flex flex-wrap gap-4 justify-between">
                      {emotions.map((emotion) => (
                        <div key={emotion.id} className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value={emotion.id} id={`pre-${emotion.id}`} />
                          <Label htmlFor={`pre-${emotion.id}`}>{emotion.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="block mb-1">רגש אחרי העסקה</Label>
                    <RadioGroup value={postTradeEmotion} onValueChange={setPostTradeEmotion} className="flex flex-wrap gap-4 justify-between">
                      {emotions.map((emotion) => (
                        <div key={emotion.id} className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value={emotion.id} id={`post-${emotion.id}`} />
                          <Label htmlFor={`post-${emotion.id}`}>{emotion.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  <div>
                    <Label htmlFor="tradeReflection" className="block mb-2">תובנות מהעסקה</Label>
                    <Textarea
                      id="tradeReflection"
                      value={tradeJournalText}
                      onChange={(e) => setTradeJournalText(e.target.value)}
                      placeholder="מה למדת מעסקה זו? האם זיהית דפוסים רגשיים שהשפיעו על ההחלטות שלך?"
                      className="h-24"
                    />
                  </div>
                  
                  <Button className="w-full mt-2 bg-primary">שמור מעקב עסקה</Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* End of day reflection */}
          <Card className="hover-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">רפלקציה יומית</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">סיכום יומי של החוויה הרגשית שלך במסחר</p>
              
              <div className="space-y-4">
                <div>
                  <Label className="block mb-2">דירוג יום המסחר</Label>
                  <ToggleGroup type="single" className="justify-between">
                    <ToggleGroupItem value="very-negative" className="flex-1">גרוע מאוד</ToggleGroupItem>
                    <ToggleGroupItem value="negative" className="flex-1">גרוע</ToggleGroupItem>
                    <ToggleGroupItem value="neutral" className="flex-1">סביר</ToggleGroupItem>
                    <ToggleGroupItem value="positive" className="flex-1">טוב</ToggleGroupItem>
                    <ToggleGroupItem value="very-positive" className="flex-1">מצוין</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                
                <div>
                  <Label className="block mb-2">האם עקבת אחר תוכנית המסחר שלך?</Label>
                  <ToggleGroup type="single" className="justify-between">
                    <ToggleGroupItem value="completely" className="flex-1">לחלוטין</ToggleGroupItem>
                    <ToggleGroupItem value="mostly" className="flex-1">ברובה</ToggleGroupItem>
                    <ToggleGroupItem value="partially" className="flex-1">חלקית</ToggleGroupItem>
                    <ToggleGroupItem value="rarely" className="flex-1">מעט</ToggleGroupItem>
                    <ToggleGroupItem value="not-at-all" className="flex-1">בכלל לא</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                
                <div>
                  <Label htmlFor="dailyReflection" className="block mb-2">רפלקציה יומית</Label>
                  <Textarea
                    id="dailyReflection"
                    placeholder="תאר את החוויה הרגשית שלך במהלך יום המסחר. מה השפיע על הרגשות שלך? אילו החלטות היו מושפעות מרגשות?"
                    className="h-32"
                  />
                </div>
                
                <div>
                  <Label className="block mb-2">תובנות עיקריות מהיום</Label>
                  <Textarea
                    placeholder="מה למדת על עצמך היום? אילו דפוסים זיהית? מה תעשה אחרת מחר?"
                    className="h-24"
                  />
                </div>
                
                <Button className="w-full mt-2 bg-primary">שמור רפלקציה יומית</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emotion Trends Chart */}
            <Card className="hover-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <LineChartIcon size={18} className="text-primary" />
                  מגמות רגשיות לאורך זמן
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={emotionTrendData}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="confidence" stroke="#4ade80" name="ביטחון" />
                      <Line type="monotone" dataKey="fear" stroke="#f87171" name="פחד" />
                      <Line type="monotone" dataKey="greed" stroke="#fb923c" name="חמדנות" />
                      <Line type="monotone" dataKey="frustration" stroke="#a855f7" name="תסכול" />
                      <Line type="monotone" dataKey="doubt" stroke="#60a5fa" name="ספק" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Emotion Distribution Chart */}
            <Card className="hover-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <PieChartIcon size={18} className="text-primary" />
                  התפלגות רגשות במסחר
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={emotionPerformanceData}
                        nameKey="name"
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      />
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Emotion vs Trade Outcome */}
            <Card className="hover-glow col-span-1 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BarChartIcon size={18} className="text-primary" />
                  השפעת רגשות על תוצאות המסחר
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tradeOutcomeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="profit" stackId="a" fill="#4ade80" name="רווח %" />
                      <Bar dataKey="loss" stackId="a" fill="#f87171" name="הפסד %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  הגרף מציג את אחוז העסקאות הרווחיות/מפסידות בהתבסס על הרגש הדומיננטי בזמן הכניסה לעסקה
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Key Insights */}
            <Card className="md:col-span-2 hover-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Lightbulb size={18} className="text-primary" />
                  תובנות פסיכולוגיות מרכזיות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/30">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
                      ביטחון מוביל לתוצאות חיוביות
                    </h3>
                    <p className="text-sm">
                      עסקאות שבוצעו מתוך תחושת ביטחון הניבו תוצאות חיוביות ב-75% מהמקרים. 
                      כדאי לזהות את המצבים שבהם אתה חש ביטחון אמיתי ולהבדיל בינם לבין ביטחון יתר.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/30">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingDown size={16} className="text-red-600 dark:text-red-400" />
                      חמדנות מובילה להפסדים
                    </h3>
                    <p className="text-sm">
                      70% מהעסקאות שבוצעו תחת השפעת חמדנות הסתיימו בהפסד. 
                      נטייה לקחת סיכונים גדולים מדי או לחפש "המכה הגדולה" פוגעת בביצועים שלך.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Info size={16} className="text-blue-600 dark:text-blue-400" />
                      אימפולסיביות אחרי הפסדים
                    </h3>
                    <p className="text-sm">
                      זיהינו דפוס של החלטות אימפולסיביות אחרי הפסדים. לאחר הפסד משמעותי, יש נטייה לבצע עסקה נוספת 
                      בתוך 15 דקות. עסקאות אלה מסתיימות בהפסד ב-65% מהמקרים.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Recommendations */}
            <Card className="hover-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">המלצות לשיפור</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-r-4 border-primary pr-4">
                    <h3 className="font-semibold mb-1">קח הפסקה יזומה</h3>
                    <p className="text-sm text-muted-foreground">
                      אחרי הפסד, קח הפסקה של 30 דקות לפחות לפני עסקה חדשה. זה יעזור להפחית החלטות רגשיות.
                    </p>
                  </div>
                  
                  <div className="border-r-4 border-primary pr-4">
                    <h3 className="font-semibold mb-1">תיעוד לפני כניסה</h3>
                    <p className="text-sm text-muted-foreground">
                      לפני כל עסקה, תעד בכתב את הסיבה לכניסה והסטרטגיה ליציאה. זה יפחית החלטות אימפולסיביות.
                    </p>
                  </div>
                  
                  <div className="border-r-4 border-primary pr-4">
                    <h3 className="font-semibold mb-1">מדיטציה קצרה</h3>
                    <p className="text-sm text-muted-foreground">
                      נסה 5 דקות של מדיטציה בבוקר לפני תחילת המסחר ו-5 דקות באמצע היום לאיפוס רגשי.
                    </p>
                  </div>
                  
                  <Button variant="outline" className="w-full mt-2">צפה בכל ההמלצות</Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Psychological Support Tools */}
          <Card className="hover-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">כלי תמיכה מנטלית</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-b from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 p-4 rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold mb-2">תרגילי נשימה</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    מספר תרגילי נשימה פשוטים שיכולים לעזור להפחית לחץ בזמן אמת.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">צפה בתרגילים</Button>
                </div>
                
                <div className="bg-gradient-to-b from-blue-50 to-green-50 dark:from-blue-900/10 dark:to-green-900/10 p-4 rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold mb-2">הנחיות להרגעה עצמית</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    טכניקות מהירות להרגעה עצמית בזמן שתחושת החרדה או הלחץ עולה.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">צפה בהנחיות</Button>
                </div>
                
                <div className="bg-gradient-to-b from-green-50 to-teal-50 dark:from-green-900/10 dark:to-teal-900/10 p-4 rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold mb-2">סרטוני העשרה</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    סרטונים קצרים על ניהול רגשות במסחר ופסיכולוגיה של קבלת החלטות.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">צפה בסרטונים</Button>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb size={16} className="text-amber-600 dark:text-amber-400" />
                  טיפ יומי
                </h3>
                <p className="text-sm">
                  "הקדש זמן לזהות את הרגשות שלך בזמן אמת. כשאתה מרגיש רגש חזק, קח צעד אחורה, נשום עמוק, ושאל את עצמך: 'האם זה רגש שאני רוצה לפעול לפיו, או רגש שעדיף לי להכיר בו ולהניח לו לעבור?'"
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmotionalTracker;
