
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainIcon, TrendingUpIcon, AlertTriangleIcon } from 'lucide-react';

const InsightsTab: React.FC = () => {
  return (
    <div className="space-y-6 rtl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Key Insights card */}
        <Card className="hover-glow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BrainIcon size={18} className="text-primary" />
              תובנות עיקריות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 text-sm text-muted-foreground rtl">
              <li>זיהיתי דפוס של חוסר סבלנות לאחר הפסדים.</li>
              <li>הצלחה מגיעה כאשר אני דבק בתוכנית המסחר.</li>
              <li>חשוב לקחת הפסקות קצרות במהלך יום המסחר.</li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Trading Patterns card */}
        <Card className="hover-glow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUpIcon size={18} className="text-primary" />
              דפוסי מסחר
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 text-sm text-muted-foreground rtl">
              <li>נוטה להצליח יותר במסחר במניות טכנולוגיה.</li>
              <li>צריך להימנע ממסחר בשעות הראשונות של המסחר.</li>
              <li>הגדרת סטופ-לוס הדוקה מדי מובילה להפסדים.</li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Emotional Alerts card */}
        <Card className="hover-glow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangleIcon size={18} className="text-primary" />
              התראות רגשיות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 text-sm text-muted-foreground rtl">
              <li>סימנים של כעס ותסכול לאחר הפסדים.</li>
              <li>אופוריה מוגזמת לאחר רצף של רווחים.</li>
              <li>חרדה לפני ביצוע עסקאות גדולות.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      
      {/* Long-term Improvement Recommendations section */}
      <div className="space-y-4 rtl">
        <h3 className="text-xl font-semibold">המלצות לשיפור ארוך טווח</h3>
        <p className="text-muted-foreground">
          בהתבסס על הנתונים שנאספו, הנה מספר המלצות לשיפור ביצועי המסחר שלך:
        </p>
        <ul className="list-decimal pl-4 text-muted-foreground rtl">
          <li>תרגל מיינדפולנס כדי לשלוט ברגשות שלך.</li>
          <li>הגדר יעדים ריאליים והיצמד אליהם.</li>
          <li>בצע ניתוח שוק מעמיק לפני כל עסקה.</li>
          <li>השתמש בסטופ-לוס כדי להגן על ההון שלך.</li>
          <li>קח הפסקות קבועות כדי להתרענן ולהתמקד.</li>
        </ul>
      </div>
    </div>
  );
};

export default InsightsTab;
