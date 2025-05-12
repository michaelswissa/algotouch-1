
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const AuthLoadError: React.FC = () => {
  const navigate = useNavigate();
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  useEffect(() => {
    // Try to get any error information from localStorage
    try {
      const storedError = localStorage.getItem('auth_error');
      if (storedError) {
        setErrorDetails(storedError);
        // Clear the error after reading it
        localStorage.removeItem('auth_error');
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
  }, []);
  
  const handleRetry = () => {
    // Clear any potential auth-related items in localStorage
    try {
      const keysToCheck = ['supabase.auth.token', 'sb-ndhakvhrrkczgylcmyoc-auth-token'];
      keysToCheck.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`Clearing ${key} from localStorage`);
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
    
    // Redirect to root and force a full page refresh
    window.location.href = '/';
  };
  
  const handleContactSupport = () => {
    // Implement contact support logic or direct to support page/email
    navigate('/support', { state: { fromError: true } });
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-background to-background/90 p-4 dark:bg-background dark:text-foreground" dir="rtl">
      <Card className="w-full max-w-md border-destructive/20">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>שגיאה בטעינת עמוד ההתחברות</CardTitle>
          </div>
          <CardDescription>
            אירעה שגיאה בטעינת העמוד. הסיבה יכולה להיות בעיה בחיבור לשרת או בתהליך האימות.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/50 p-4 text-sm">
            <p>אנא נסה את הפעולות הבאות:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>ודא שיש לך חיבור אינטרנט פעיל ויציב</li>
              <li>נקה את מטמון הדפדפן ועוגיות</li>
              <li>רענן את הדף</li>
              <li>נסה להתחבר מדפדפן אחר</li>
            </ul>
          </div>
          
          {errorDetails && (
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <p className="font-semibold">פרטי השגיאה:</p>
              <p className="font-mono mt-1">{errorDetails}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleRetry} 
            size="lg"
            className="w-full"
            variant="default"
          >
            נסה שוב
          </Button>
          <Button 
            onClick={() => window.location.href = '/auth'}
            size="lg"
            className="w-full"
            variant="outline"
          >
            חזור לדף ההתחברות
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthLoadError;
