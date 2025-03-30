
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainIcon, TrendingUpIcon, AlertTriangleIcon, LightbulbIcon, BarChart3Icon, BookOpenIcon } from 'lucide-react';

const InsightsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Main insights cards */}
      <div className="space-y-4">
        <Card className="bg-emerald-950/30 border-emerald-800 hover:bg-emerald-950/40 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-emerald-400">
              <BrainIcon size={18} className="text-emerald-400" />
              <span className="rtl">ביטחון מוביל לתוצאות חיוביות</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-200 rtl">
              עסקאות שנפתחו מתוך תחושת ביטחון הניבו תוצאות חיוביות ב-75% מהמקרים. כדאי לזהות את המצבים שבהם אתה חש ביטחון אמיתי ולהתבסס יותר על ביטחון יציב.
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-red-950/30 border-red-800 hover:bg-red-950/40 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-red-400">
              <AlertTriangleIcon size={18} className="text-red-400" />
              <span className="rtl">הימנעות מובילה להפסדים</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-200 rtl">
              מההערכות שבחנו נראה שהשפעת הימנעות מסיכונים בשיקול. ניסיון לקחת סיכונים בתנאים חדי לא מאפשר "הזדמנות הנדירה" ופוגעת ב-70% מביצועים שלך.
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-950/30 border-blue-800 hover:bg-blue-950/40 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-blue-400">
              <TrendingUpIcon size={18} className="text-blue-400" />
              <span className="rtl">אימפולסיביות אחרי הפסדים</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-200 rtl">
              זיהינו דפוס של החלטות אימפולסיביות אחרי הפסדים. לאחר הפסד משמעותי, יש נטייה לבצע עסקה נוספת בתוך 15 דקות. עסקאות אלה מסתיימות בהפסד ב-65% מהמקרים.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Bottom recommendations section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="bg-gray-900/80 hover:bg-gray-900/90 transition-colors border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold rtl">גורמי השפעה</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300 rtl">
              גורמים קיצוניים על ניהול רגשות במסחר וההשפעות של הנבת ההחלטות.
            </p>
            <button className="mt-4 w-full py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition-colors rtl">צפה בגורמים</button>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900/80 hover:bg-gray-900/90 transition-colors border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold rtl">התניות להרגעה עצמית</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300 rtl">
              טכניקות מוכחות להרגעה עצמית בזמן שתחושת החרדה או הלחץ עולה.
            </p>
            <button className="mt-4 w-full py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition-colors rtl">צפה בהתניות</button>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900/80 hover:bg-gray-900/90 transition-colors border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold rtl">תרגילי נשימה</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300 rtl">
              מספר תרגילי נשימה פשוטים שיכולים לעזור להפחית לחץ בזמן אמת.
            </p>
            <button className="mt-4 w-full py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition-colors rtl">צפה בתרגילים</button>
          </CardContent>
        </Card>
      </div>
      
      {/* Quote section */}
      <Card className="bg-orange-950/20 border-orange-800 hover:bg-orange-950/30 transition-colors">
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            <LightbulbIcon size={20} className="text-orange-400 shrink-0" />
            <p className="text-sm text-gray-200 rtl">
              "הצלחה! זמן לחוות את הרגשות שלך בזמן אמת. כשאתה מרגיש רגש כמו פחד, חרדה, בושם עצמי, ושאל את עצמך: האם זה רגש שאני רוצה לפעול לפיו, או רגש שעדיף לי להכיר בו ולתת לו לעבור"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsTab;
