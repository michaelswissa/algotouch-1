
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface ErrorDetailsCardProps {
  title: string;
  errorDetails: string;
  className?: string;
}

const ErrorDetailsCard: React.FC<ErrorDetailsCardProps> = ({
  title,
  errorDetails,
  className = "border-red-500/50 bg-red-500/5 mb-8"
}) => {
  // Try to parse the error details as JSON for better display
  let formattedError = errorDetails;
  let parsedError = null;
  
  try {
    parsedError = JSON.parse(errorDetails);
    formattedError = JSON.stringify(parsedError, null, 2);
  } catch (e) {
    // Not valid JSON, use as is
  }
  
  // Extract SMTP-specific errors
  const isSmtpError = 
    (typeof errorDetails === 'string' && 
      (errorDetails.includes('SMTP') || 
       errorDetails.includes('smtp') || 
       errorDetails.includes('email') || 
       errorDetails.includes('connection'))) ||
    (parsedError && 
      JSON.stringify(parsedError).toLowerCase().includes('smtp'));
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-red-950/10 p-4 rounded-md overflow-auto text-xs leading-relaxed text-red-600 dark:text-red-400" dir="ltr">
          {formattedError}
        </pre>
        
        {isSmtpError && (
          <div className="mt-4 bg-red-950/5 p-3 rounded-md border border-red-200 dark:border-red-800/50">
            <p className="font-medium mb-2">פתרונות אפשריים:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>בדוק שהפרטים ב-<code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code> ו-<code>SMTP_PASSWORD</code> נכונים</li>
              <li>אם אתה משתמש ב-Gmail, ודא שהפעלת גישה לאפליקציות פחות מאובטחות או שיצרת סיסמת אפליקציה</li>
              <li>בדוק שאין חסימת חיבורים מהשרת שלך לשרת ה-SMTP</li>
              <li>ודא שכתובת השולח (<code>SMTP_FROM</code>) היא כתובת תקפה ומורשית לשליחה</li>
              <li>נסה להחליף את הפורט ל-465 (SSL) או 587 (TLS) או 25 (לא מאובטח)</li>
              <li>בדוק את הגדרות האבטחה של ספק המייל שלך</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorDetailsCard;
