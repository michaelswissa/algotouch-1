
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainIcon, TrendingUpIcon, AlertTriangleIcon, LightbulbIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const InsightsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Main insights section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 rtl mb-3">
          <LightbulbIcon size={20} className="text-cyan-400" />
          <h2 className="text-lg font-semibold text-cyan-400">תובנות פסיכולוגיות מרכזיות</h2>
        </div>

        {/* Green Card - Confidence */}
        <Card className="insight-card insight-card-green">
          <CardContent className="py-4 px-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-1">
                <BrainIcon size={18} className="text-emerald-400" />
              </div>
              <div className="rtl flex-1">
                <h3 className="insight-header text-emerald-400">ביטחון מוביל לתוצאות חיוביות</h3>
                <p className="insight-text">
                  עסקאות שנפתחו מתוך תחושת ביטחון הניבו תוצאות חיוביות ב-75% מהמקרים. כדאי לזהות את המצבים שבהם אתה חש ביטחון אמיתי ולהתבסס יותר בביטחון יציב.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Red Card - Avoidance */}
        <Card className="insight-card insight-card-red">
          <CardContent className="py-4 px-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-1">
                <AlertTriangleIcon size={18} className="text-red-400" />
              </div>
              <div className="rtl flex-1">
                <h3 className="insight-header text-red-400">הימנעות מובילה להפסדים</h3>
                <p className="insight-text">
                  מהתצפיות שבחנו נראה שהשפעת הימנעות מסיכונים בשיקול. ניסיון לקחת סיכונים בתנאים חדשים לא מאפשר "הזדמנות נדירה" ופוגעת ב-70% מביצועים שלך.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Blue Card - Impulsivity */}
        <Card className="insight-card insight-card-blue">
          <CardContent className="py-4 px-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-1">
                <TrendingUpIcon size={18} className="text-blue-400" />
              </div>
              <div className="rtl flex-1">
                <h3 className="insight-header text-blue-400">אימפולסיביות אחרי הפסדים</h3>
                <p className="insight-text">
                  זיהינו דפוס של החלטות אימפולסיביות אחרי הפסדים. לאחר הפסד משמעותי, יש נטייה לבצע עסקה נוספת בתוך 15 דקות. עסקאות אלה מסתיימות בהפסד ב-65% מהמקרים.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recommendations section */}
      <div className="space-y-2 mt-6">
        <h2 className="insight-header text-white mb-2 pr-2">המלצות לשיפור</h2>
        
        <div className="space-y-0.5">
          {/* Recommendation 1 */}
          <div className="recommendation-card border-cyan-500">
            <h3 className="text-sm font-semibold mb-1">קח הפסקה נכונה</h3>
            <p className="text-xs text-gray-300">
              אחרי הפסד, קח הפסקה של 30 דקות לפחות לפני עסקה הבאה. זה יעזור להפחית החלטות רגשיות.
            </p>
          </div>

          {/* Recommendation 2 */}
          <div className="recommendation-card border-cyan-500">
            <h3 className="text-sm font-semibold mb-1">תיעוד לפני כניסה</h3>
            <p className="text-xs text-gray-300">
              לפני כל עסקה, תעד בכתב את הסיבה לכניסה והאסטרטגיה ליציאה. זה יפחית החלטות אימפולסיביות.
            </p>
          </div>

          {/* Recommendation 3 */}
          <div className="recommendation-card border-cyan-500">
            <h3 className="text-sm font-semibold mb-1">מוטיבציה קבועה</h3>
            <p className="text-xs text-gray-300">
              נסח 5 דקות של מוטיבציה בבוקר לפני תחילת המסחר ו-5 דקות באמצע היום לאיפוס רגשי.
            </p>
          </div>

          <div className="p-2 flex justify-center">
            <Button 
              className="bg-slate-700 text-white hover:bg-slate-600 w-full rounded-md py-2 text-sm" 
            >
              צפה בכל ההמלצות
            </Button>
          </div>
        </div>
      </div>
      
      {/* Additional tools section */}
      <div className="pt-2">
        <h2 className="insight-header text-white mb-3 pr-2">כלי תמיכה נוספים</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Card className="tool-card">
            <h3 className="text-sm font-semibold mb-1">סרטוני העשרה</h3>
            <p className="text-xs text-gray-300 mb-3">
              סרטונים קצרים על ניהול רגשות במסחר ופסיכולוגיה של קבלת החלטות.
            </p>
            <Button className="w-full py-1 bg-slate-800 text-gray-200 rounded hover:bg-slate-700 transition-colors text-xs">
              צפה בסרטונים
            </Button>
          </Card>
          
          <Card className="tool-card">
            <h3 className="text-sm font-semibold mb-1">התניות להרגעה עצמית</h3>
            <p className="text-xs text-gray-300 mb-3">
              טכניקות מיוחדות להרגעה עצמית בזמן שתחושת החרדה או הלחץ עולה.
            </p>
            <Button className="w-full py-1 bg-slate-800 text-gray-200 rounded hover:bg-slate-700 transition-colors text-xs">
              צפה בהתניות
            </Button>
          </Card>
          
          <Card className="tool-card">
            <h3 className="text-sm font-semibold mb-1">תרגילי נשימה</h3>
            <p className="text-xs text-gray-300 mb-3">
              מספר תרגילי נשימה פשוטים שיכולים לעזור להפחית לחץ בזמן אמת.
            </p>
            <Button className="w-full py-1 bg-slate-800 text-gray-200 rounded hover:bg-slate-700 transition-colors text-xs">
              צפה בתרגילים
            </Button>
          </Card>
        </div>
      </div>
      
      {/* Quote section */}
      <Card className="quote-card">
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            <LightbulbIcon size={20} className="text-orange-400 shrink-0" />
            <p className="text-sm text-gray-200">
              "זיכרונות שלך בזמן אמת, כשאתה מרגיש רגש כמו פחד אהבה, בושם עצמי, ושאל את עצמך: האם זה רגש שאני רוצה לפעול לפיו, או רגש שעדיף לי להכיר בו ולתת לו לעבור"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsTab;
