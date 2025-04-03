
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { ConnectionStatus } from './types';

interface ConnectionStatusAlertsProps {
  connectionStatus: ConnectionStatus;
  networkError: string | null;
  supabaseFunctionsUrl?: string;
}

const ConnectionStatusAlerts: React.FC<ConnectionStatusAlertsProps> = ({
  connectionStatus,
  networkError,
  supabaseFunctionsUrl
}) => {
  return (
    <>
      <Alert className="mb-6 bg-blue-500/10 border-blue-500/50 text-blue-700 dark:text-blue-400">
        <Info className="h-4 w-4" />
        <AlertTitle>מידע</AlertTitle>
        <AlertDescription>
          מידע על הפרויקט: {supabaseFunctionsUrl || 'לא זמין'}
        </AlertDescription>
      </Alert>
      
      {networkError && (
        <Alert className="mb-6 bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-400">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>שגיאת תקשורת</AlertTitle>
          <AlertDescription>
            נראה שיש בעיית תקשורת עם Edge Function. ייתכן שהפונקציה טרם הופעלה או שיש בעיה בהגדרות CORS.
            <br />
            פרטים נוספים:
            <pre className="bg-orange-950/10 p-2 mt-2 rounded-md overflow-auto text-xs leading-relaxed text-orange-600 dark:text-orange-400" dir="ltr">
              {networkError}
            </pre>
          </AlertDescription>
        </Alert>
      )}
      
      {connectionStatus === 'error' && !networkError && (
        <Alert className="mb-6 bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>שגיאת התחברות</AlertTitle>
          <AlertDescription>
            נכשל בהתחברות לשירות שליחת מיילים. וודא שהפונקציה הופעלה וההגדרות תקינות.
          </AlertDescription>
        </Alert>
      )}
      
      {connectionStatus === 'success' && (
        <Alert className="mb-6 bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>חיבור מוצלח</AlertTitle>
          <AlertDescription>
            התחברות לשירות שליחת מיילים הצליחה בהצלחה!
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default ConnectionStatusAlerts;
