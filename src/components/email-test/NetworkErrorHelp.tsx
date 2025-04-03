
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info } from 'lucide-react';

interface NetworkErrorHelpProps {
  networkError: string;
}

const NetworkErrorHelp: React.FC<NetworkErrorHelpProps> = ({ networkError }) => {
  return (
    <Card className="border-orange-500/50 bg-orange-500/5 mb-8">
      <CardHeader>
        <CardTitle className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>פרטי שגיאת תקשורת</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p>בדיקות שאתה יכול לבצע:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>ודא שה-Edge Function הופעלה בסופאבייס (Deployed Functions).</li>
            <li>בדוק שהסודות (Secrets) הוגדרו כראוי בסופאבייס:</li>
            <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
              <li><code>SMTP_HOST</code>: שרת ה-SMTP (למשל: smtp.gmail.com)</li>
              <li><code>SMTP_PORT</code>: פורט (בד"כ 587 עבור TLS)</li>
              <li><code>SMTP_USER</code>: שם המשתמש/כתובת המייל</li>
              <li><code>SMTP_PASSWORD</code>: סיסמת המייל או סיסמת אפליקציה</li>
              <li><code>SMTP_FROM</code>: כתובת השולח (בד"כ זהה ל-SMTP_USER)</li>
            </ul>
            <li>ודא שהגדרות ה-CORS מאפשרות גישה מהאפליקציה שלך.</li>
            <li>בדוק ב- Google אם הגדרות האבטחה מאפשרות גישה לאפליקציות פחות מאובטחות או הגדר סיסמת אפליקציה.</li>
            <li>ודא שכתובת השולח (<code>SMTP_FROM</code>) וכתובת הנמען שווים או שכתובת השולח מורשית לשלוח מיילים.</li>
          </ol>
          
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200 dark:border-blue-800/50 mt-4">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-300">הערה חשובה לגבי Gmail</p>
              <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                אם אתה משתמש ב-Gmail, יש להפעיל "גישה לאפליקציות פחות מאובטחות" או ליצור סיסמת אפליקציה.
                בנוסף, ודא שהשדה "SMTP_FROM" מוגדר נכון ושאין חוסר התאמה בין כתובת השולח לבין כתובת המקבל.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkErrorHelp;
