
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp, TrendingDown, Info } from 'lucide-react';

const InsightsTab: React.FC = () => {
  return (
    <div className="space-y-6">
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
    </div>
  );
};

export default InsightsTab;
