
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const TestEmail = () => {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recipient, setRecipient] = useState('support@algotouch.co.il');

  const testGmailAuth = async () => {
    try {
      setTestLoading(true);
      setResult(null);
      
      const { data, error } = await supabase.functions.invoke('test-gmail');
      
      if (error) {
        console.error('Error testing Gmail API:', error);
        toast.error('שגיאה בבדיקת API של Gmail');
        setResult({ error: error.message });
        return;
      }
      
      setResult(data);
      toast.success('בדיקת API של Gmail הצליחה!');
    } catch (error) {
      console.error('Exception testing Gmail API:', error);
      toast.error('שגיאה בבדיקת API של Gmail');
      setResult({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const sendTestEmail = async () => {
    try {
      setLoading(true);
      setResult(null);
      
      const { data, error } = await supabase.functions.invoke('gmail-sender', {
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
      
      if (error) {
        console.error('Error sending test email:', error);
        toast.error('שגיאה בשליחת מייל בדיקה');
        setResult({ error: error.message });
        return;
      }
      
      setResult(data);
      toast.success('מייל בדיקה נשלח בהצלחה!');
    } catch (error) {
      console.error('Exception sending test email:', error);
      toast.error('שגיאה בשליחת מייל בדיקה');
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="py-8" hideSidebar={true}>
      <div className="max-w-4xl mx-auto px-4" dir="rtl">
        <h1 className="text-3xl font-bold mb-8">בדיקת Gmail API</h1>
        
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
                disabled={loading || !recipient}
                className="w-full"
              >
                {loading ? 'שולח מייל...' : 'שלח מייל בדיקה'}
              </Button>
            </CardFooter>
          </Card>
          
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
