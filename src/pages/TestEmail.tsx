
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ConnectionTestCard } from '@/components/email-test/ConnectionTestCard';
import { SendEmailCard } from '@/components/email-test/SendEmailCard';
import { ResultCard } from '@/components/email-test/ResultCard';
import { DevelopmentWarning } from '@/components/email-test/DevelopmentWarning';
import { ConnectionStatus, EmailTestResult } from '@/components/email-test/types';
import { testSmtpConnection } from '@/lib/email-service';
import { sendEmail } from '@/lib/email-service';

export default function TestEmail() {
  const [smtpResult, setSmtpResult] = useState<EmailTestResult | null>(null);
  const [isSmtpTesting, setIsSmtpTesting] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<ConnectionStatus>('unknown');
  
  const [sendResult, setSendResult] = useState<EmailTestResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // Test SMTP Connection
  const testSmtp = async () => {
    try {
      setIsSmtpTesting(true);
      setSmtpResult(null);
      
      const result = await testSmtpConnection();
      setSmtpResult(result);
      setSmtpStatus(result.success ? 'success' : 'error');
    } catch (error: any) {
      setSmtpResult({ 
        success: false, 
        error: error.message || 'Unknown error testing SMTP connection' 
      });
      setSmtpStatus('error');
    } finally {
      setIsSmtpTesting(false);
    }
  };
  
  // Send a test email
  const sendTestEmail = async (recipient: string) => {
    try {
      setIsSending(true);
      setSendResult(null);
      
      const result = await sendEmail({
        to: recipient,
        subject: 'בדיקת שליחת אימייל מ-AlgoTouch',
        html: `
          <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
            <h1 style="color: #4a90e2;">בדיקת מערכת</h1>
            <p>שלום,</p>
            <p>זהו מייל בדיקה ממערכת AlgoTouch.</p>
            <p>אם קיבלת את ההודעה הזו, סימן שמערכת שליחת האימיילים עובדת כראוי.</p>
            <p>זמן שליחה: ${new Date().toLocaleString('he-IL')}</p>
            <hr style="border: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">הודעה זו נשלחה אוטומטית ואין צורך להשיב עליה.</p>
          </div>
        `
      });
      
      setSendResult(result);
    } catch (error: any) {
      setSendResult({ 
        success: false, 
        error: error.message || 'Unknown error sending test email' 
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>בדיקת מערכת האימייל</CardTitle>
            <CardDescription>
              כלי זה מאפשר לבדוק את תקינות הגדרות האימייל ולשלוח אימיילים לבדיקה
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DevelopmentWarning />
            
            {/* Test SMTP connection */}
            <ConnectionTestCard
              title="בדיקת הגדרות SMTP"
              description="בדוק האם הגדרות ה-SMTP תקינות ומאפשרות שליחת דואר אלקטרוני"
              onTest={testSmtp}
              isLoading={isSmtpTesting}
              connectionStatus={smtpStatus}
            />
            
            <Separator className="my-6" />
            
            {/* Send test email */}
            <SendEmailCard
              title="שלח אימייל בדיקה"
              description="שלח הודעת בדיקה כדי לוודא שהמערכת עובדת כראוי"
              onSend={sendTestEmail}
              isLoading={isSending}
              connectionStatus={smtpStatus}
            />
            
            {/* Display results */}
            {(smtpResult || sendResult) && (
              <div className="mt-6 space-y-6">
                {smtpResult && (
                  <ResultCard result={smtpResult} />
                )}
                
                {sendResult && (
                  <ResultCard result={sendResult} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
