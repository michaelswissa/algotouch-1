
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NetworkErrorHelpProps {
  networkError: string;
}

const NetworkErrorHelp: React.FC<NetworkErrorHelpProps> = ({ networkError }) => {
  return (
    <Card className="border-orange-500/50 bg-orange-500/5 mb-8">
      <CardHeader>
        <CardTitle className="text-orange-600 dark:text-orange-400">פרטי שגיאת תקשורת</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p>בדיקות שאתה יכול לבצע:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>ודא שה-Edge Function הופעלה בסופאבייס.</li>
            <li>בדוק שהסודות (Secrets) הוגדרו כראוי בסופאבייס.</li>
            <li>ודא שהגדרות ה-CORS מאפשרות גישה לאפליקציה שלך.</li>
            <li>נסה לגשת לפונקציה באופן ישיר דרך ה-URL שלה (עם המפתח המתאים).</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkErrorHelp;
