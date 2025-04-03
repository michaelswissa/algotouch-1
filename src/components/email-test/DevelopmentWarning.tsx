
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const DevelopmentWarning: React.FC = () => {
  return (
    <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>הודעת מערכת</AlertTitle>
      <AlertDescription>
        אתה נמצא בסביבת פיתוח. שים לב שפונקציות Edge לא תעבודנה בסביבה זו אלא אם כן 
        הגדרת אותן לעבודה מקומית. במקרה שיש שגיאה, בדוק את ההגדרות בסופאבייס.
      </AlertDescription>
    </Alert>
  );
};

export default DevelopmentWarning;
