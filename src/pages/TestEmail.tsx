
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TestEmail = () => {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recipient, setRecipient] = useState('support@algotouch.co.il');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gmail' | 'smtp'>('smtp');

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
      setNetworkError(null);
      
      console.log('Testing Gmail API connection...');
      
      // Display the project info for debugging
      const projectInfo = {
        projectUrl: supabase.functions.url?.toString(),
        projectId: supabase.functions.url?.split('/')[2]?.split('.')[0] || 'unknown'
      };
      console.log('Supabase Project Info:', projectInfo);
      
      // Add a timeout to detect if the function call hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 20 seconds')), 20000);
      });
      
      // Call the test-gmail function with a timeout
      try {
        const functionPromise = supabase.functions.invoke('test-gmail');
        const { data, error } = await Promise.race([functionPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('Error testing Gmail API:', error);
          toast.error('שגיאה בבדיקת API של Gmail');
          setConnectionStatus('error');
          setErrorDetails(JSON.stringify(error, null, 2));
          setResult({ error: error.message });
          return;
        }
        
        setConnectionStatus('success');
        setResult(data);
        toast.success('בדיקת API של Gmail הצליחה!');
      } catch (fetchError: any) {
        console.error('Fetch error testing Gmail API:', fetchError);
        
        // Set network error specifically
        setNetworkError(JSON.stringify({
          message: fetchError.message || 'Network error occurred',
          name: fetchError.name || 'NetworkError',
          stack: fetchError.stack,
          details: fetchError
        }, null, 2));
        
        toast.error('שגיאת רשת בבדיקת API של Gmail');
        setConnectionStatus('error');
        setResult({ error: fetchError.message });
      }
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

  const testSmtpEmail = async () => {
    try {
      setTestLoading(true);
      setResult(null);
      setConnectionStatus('unknown');
      setErrorDetails(null);
      setNetworkError(null);
      
      console.log('Testing SMTP connection...');
      
      // Display the project info for debugging
      const projectInfo = {
        projectUrl: supabase.functions.url?.toString(),
        projectId: supabase.functions.url?.split('/')[2]?.split('.')[0] || 'unknown'
      };
      console.log('Supabase Project Info:', projectInfo);
      
      // Add a timeout to detect if the function call hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 20 seconds')), 20000);
      });
      
      // Call the smtp-sender function with a minimal test
      try {
        const functionPromise = supabase.functions.invoke('smtp-sender', {
          body: {
            to: 'support@algotouch.co.il',
            subject: 'SMTP Test Connection',
            html: `<div>SMTP test email sent at ${new Date().toLocaleString()}</div>`
          }
        });
        
        const { data, error } = await Promise.race([functionPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('Error testing SMTP connection:', error);
          toast.error('שגיאה בבדיקת SMTP');
          setConnectionStatus('error');
          setErrorDetails(JSON.stringify(error, null, 2));
          setResult({ error: error.message });
          return;
        }
        
        setConnectionStatus('success');
        setResult(data);
        toast.success('בדיקת SMTP הצליחה!');
      } catch (fetchError: any) {
        console.error('Fetch error testing SMTP:', fetchError);
        
        // Set network error specifically
        setNetworkError(JSON.stringify({
          message: fetchError.message || 'Network error occurred',
          name: fetchError.name || 'NetworkError',
          stack: fetchError.stack,
          details: fetchError
        }, null, 2));
        
        toast.error('שגיאת רשת בבדיקת SMTP');
        setConnectionStatus('error');
        setResult({ error: fetchError.message });
      }
    } catch (error: any) {
      console.error('Exception testing SMTP:', error);
      toast.error('שגיאה בבדיקת SMTP');
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
      setNetworkError(null);
      
      console.log('Sending test email to:', recipient);
      
      // Add a timeout to detect if the function call hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 20 seconds')), 20000);
      });
      
      // Call the email sender function with a timeout
      try {
        const functionName = activeTab === 'gmail' ? 'gmail-sender' : 'smtp-sender';
        console.log(`Using ${functionName} for sending test email`);
        
        const functionPromise = supabase.functions.invoke(functionName, {
          body: {
            to: recipient,
            subject: 'בדיקת מייל מ-AlgoTouch',
            html: `
              <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333;">
                <h1>זהו מייל בדיקה</h1>
                <p>הפונקציונליות של שליחת מיילים עובדת כראוי.</p>
                <p>נשלח ב: ${new Date().toLocaleString('he-IL')}</p>
                <p>נשלח באמצעות: ${activeTab === 'gmail' ? 'Gmail API' : 'SMTP'}</p>
              </div>
            `,
          },
        });
        
        const { data, error } = await Promise.race([functionPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('Error sending test email:', error);
          toast.error('שגיאה בשליחת מייל בדיקה');
          setErrorDetails(JSON.stringify(error, null, 2));
          setResult({ error: error.message });
          return;
        }
        
        setResult(data);
        toast.success('מייל בדיקה נשלח בהצלחה!');
      } catch (fetchError: any) {
        console.error('Fetch error sending test email:', fetchError);
        
        // Set network error specifically
        setNetworkError(JSON.stringify({
          message: fetchError.message || 'Network error occurred',
          name: fetchError.name || 'NetworkError',
          stack: fetchError.stack,
          details: fetchError
        }, null, 2));
        
        toast.error('שגיאת רשת בשליחת מייל בדיקה');
        setResult({ error: fetchError.message });
      }
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
        <h1 className="text-3xl font-bold mb-8">בדיקת שליחת דוא"ל</h1>
        
        {isDevelopment && (
          <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>הודעת מערכת</AlertTitle>
            <AlertDescription>
              אתה נמצא בסביבת פיתוח. שים לב שפונקציות Edge לא תעבודנה בסביבה זו אלא אם כן 
              הגדרת אותן לעבודה מקומית. במקרה שיש שגיאה, בדוק את ההגדרות בסופאבייס.
            </AlertDescription>
          </Alert>
        )}
        
        <Alert className="mb-6 bg-blue-500/10 border-blue-500/50 text-blue-700 dark:text-blue-400">
          <Info className="h-4 w-4" />
          <AlertTitle>מידע</AlertTitle>
          <AlertDescription>
            מידע על הפרויקט: {supabase.functions.url?.toString() || 'לא זמין'}
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
        
        <Tabs defaultValue="smtp" className="mb-6" onValueChange={(value) => setActiveTab(value as 'gmail' | 'smtp')}>
          <TabsList className="grid grid-cols-2 w-full md:w-[400px] mb-4">
            <TabsTrigger value="smtp">SMTP (מומלץ)</TabsTrigger>
            <TabsTrigger value="gmail">Gmail API</TabsTrigger>
          </TabsList>
          
          <TabsContent value="smtp">
            <div className="grid gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>בדיקת חיבור לשירות SMTP</CardTitle>
                  <CardDescription>בדיקה שהגדרות SMTP תקינות וניתן לשלוח מיילים</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button 
                    onClick={testSmtpEmail} 
                    disabled={testLoading}
                    className="w-full"
                    variant={connectionStatus === 'error' ? "destructive" : (connectionStatus === 'success' ? "success" : "default")}
                  >
                    {testLoading ? 'בדיקה מתבצעת...' : 'בדוק חיבור SMTP'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="gmail">
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
            </div>
          </TabsContent>
        </Tabs>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>שליחת מייל בדיקה ({activeTab === 'gmail' ? 'Gmail API' : 'SMTP'})</CardTitle>
            <CardDescription>
              שליחת מייל בדיקה באמצעות הפונקציה {activeTab === 'gmail' ? 'gmail-sender' : 'smtp-sender'}
            </CardDescription>
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
        
        {networkError && (
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
        )}
        
        {errorDetails && (
          <Card className="border-red-500/50 bg-red-500/5 mb-8">
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
    </Layout>
  );
};

export default TestEmail;
