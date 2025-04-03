
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

const TestEmail = () => {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recipient, setRecipient] = useState('support@algotouch.co.il');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Check if we're running in development or production
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';

  useEffect(() => {
    // Set up error handling for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      setErrorDetails(JSON.stringify({
        message: event.reason?.message || 'Unknown error',
        stack: event.reason?.stack,
        details: event.reason
      }, null, 2));
      toast.error('שגיאה לא מטופלת התרחשה');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const testGmailAuth = async () => {
    try {
      setTestLoading(true);
      setResult(null);
      setConnectionStatus('unknown');
      setErrorDetails(null);
      
      console.log('Testing Gmail API connection...');
      
      // Add a timeout to detect if the function call hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000);
      });
      
      // Call the test-gmail function with a timeout
      const functionPromise = supabase.functions.invoke('test-gmail');
      const { data, error } = await Promise.race([functionPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Error testing Gmail API:', error);
        toast.error('שגיאה בבדיקת API של Gmail');
        setConnectionStatus('error');
        setErrorDetails(JSON.stringify({
          message: error.message,
          name: error.name,
          stack: error.stack,
          details: error
        }, null, 2));
        setResult({ error: error.message });
        return;
      }
      
      setConnectionStatus('success');
      setResult(data);
      toast.success('בדיקת API של Gmail הצליחה!');
    } catch (error: any) {
      console.error('Exception testing Gmail API:', error);
      toast.error('שגיאה בבדיקת API של Gmail');
      setConnectionStatus('error');
      setErrorDetails(JSON.stringify({
        message: error.message,
        name: error.name,
        stack: error.stack,
        details: error
      }, null, 2));
      setResult({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const sendTestEmail = async () => {
    try {
      setLoading(true);
      setResult(null);
      setErrorDetails(null);
      
      console.log('Sending test email to:', recipient);
      
      // Add a timeout to detect if the function call hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000);
      });
      
      // Call the gmail-sender function with a timeout
      const functionPromise = supabase.functions.invoke('gmail-sender', {
        body: {
          to: recipient,
          subject: 'בדיקת מייל מ-AlgoTouch',
          html: `
            <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333;">
              <h1>זהו מייל בדיקה</h1>
              <p>הפונקציונליות של שליחת מיילים עובדת כראוי.</p>
              <p>נשלח ב: ${new Date().toLocaleString('he-IL')}</p>
            </div>
          `,
        },
      });
      
      const { data, error } = await Promise.race([functionPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Error sending test email:', error);
        toast.error('שגיאה בשליחת מייל בדיקה');
        setErrorDetails(JSON.stringify({
          message: error.message,
          name: error.name,
          stack: error.stack,
          details: error
        }, null, 2));
        setResult({ error: error.message });
        return;
      }
      
      setResult(data);
      toast.success('מייל בדיקה נשלח בהצלחה!');
    } catch (error: any) {
      console.error('Exception sending test email:', error);
      toast.error('שגיאה בשליחת מייל בדיקה');
      setErrorDetails(JSON.stringify({
        message: error.message,
        name: error.name,
        stack: error.stack,
        details: error
      }, null, 2));
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="py-8" hideSidebar={true}>
      <div className="max-w-4xl mx-auto px-4" dir="rtl">
        <h1 className="text-3xl font-bold mb-8">בדיקת Gmail API</h1>
        
        {isDevelopment && (
          <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>הודעת מערכת</AlertTitle>
            <AlertDescription>
              אתה נמצא בסביבת פיתוח. שים לב שפונקציות Edge לא תעבודנה בסביבה זו אלא אם כן 
              הגדרת אותן לעבודה מקומית. במקרה שיש שגיאה, בדוק את הגדרות ה-Google OAuth שלך.
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'error' && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>שגיאת התחברות</AlertTitle>
            <AlertDescription>
              נכשל בהתחברות ל-Edge Function. וודא שהפונקציה הופעלה ואשר את הגדרות ה-OAuth.
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'success' && (
          <Alert className="mb-6 bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>חיבור מוצלח</AlertTitle>
            <AlertDescription>
              התחברות ל-Gmail API הצליחה בהצלחה!
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>בדיקת חיבור לשירות Gmail API</CardTitle>
              <CardDescription>בדיקה שההרשאות והחיבור לשירות Gmail API תקינים</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                onClick={testGmailAuth} 
                disabled={testLoading}
                className="w-full"
                variant={connectionStatus === 'error' ? "destructive" : (connectionStatus === 'success' ? "success" : "default")}
              >
                {testLoading ? 'בדיקה מתבצעת...' : 'בדוק הרשאות Gmail API'}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>שליחת מייל בדיקה</CardTitle>
              <CardDescription>שליחת מייל בדיקה באמצעות הפונקציה gmail-sender</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="recipient" className="block mb-2 font-medium">כתובת הנמען</label>
                  <Input 
                    id="recipient"
                    value={recipient} 
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="דוא״ל הנמען"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={sendTestEmail} 
                disabled={loading || !recipient || connectionStatus === 'error'}
                className="w-full"
              >
                {loading ? 'שולח מייל...' : 'שלח מייל בדיקה'}
              </Button>
            </CardFooter>
          </Card>
          
          {errorDetails && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">פרטי השגיאה</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-red-950/10 p-4 rounded-md overflow-auto text-xs leading-relaxed text-red-600 dark:text-red-400" dir="ltr">
                  {errorDetails}
                </pre>
              </CardContent>
            </Card>
          )}
          
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>תוצאות הבדיקה</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs leading-relaxed" dir="ltr">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TestEmail;
