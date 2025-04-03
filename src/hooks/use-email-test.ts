
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ConnectionStatus, EmailTestResult } from '@/components/email-test/types';
import { testSmtpConnection } from '@/lib/email-service';

export function useEmailTest() {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [result, setResult] = useState<EmailTestResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gmail' | 'smtp'>('smtp');
  
  // Check if we're running in development or production
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';

  // Get the Supabase function URL (safely)
  const getSupabaseFunctionsUrl = () => {
    try {
      // Create a mock URL that we can extract the base URL from
      const projectRef = supabase.projectRef || '';
      return `https://${projectRef}.supabase.co/functions/v1`;
    } catch (e) {
      return '';
    }
  };

  const resetErrors = () => {
    setResult(null);
    setConnectionStatus('unknown');
    setErrorDetails(null);
    setNetworkError(null);
  };

  const testGmailAuth = async () => {
    try {
      setTestLoading(true);
      resetErrors();
      
      console.log('Testing Gmail API connection...');
      
      // Display the project info for debugging
      const projectInfo = {
        projectUrl: getSupabaseFunctionsUrl(),
        projectId: getSupabaseFunctionsUrl().split('.')[0]?.split('/')[2] || 'unknown'
      };
      console.log('Supabase Project Info:', projectInfo);
      
      // Add a timeout to detect if the function call hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 20 seconds')), 20000);
      });
      
      // Call the test-gmail function with a timeout
      try {
        console.log('Invoking test-gmail function...');
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
      resetErrors();
      
      console.log('Testing SMTP connection...');
      const functionsUrl = getSupabaseFunctionsUrl();
      console.log('Supabase Functions URL:', functionsUrl);
      
      const { success, details, error } = await testSmtpConnection();
      
      if (!success || error) {
        console.error('Error testing SMTP connection:', error);
        toast.error('שגיאה בבדיקת SMTP');
        setConnectionStatus('error');
        
        if (error && error.includes('Network error')) {
          setNetworkError(JSON.stringify({
            message: error,
            name: 'NetworkError',
            details: 'The Edge Function may not be deployed or CORS issues'
          }, null, 2));
        } else {
          setErrorDetails(JSON.stringify({
            message: error,
            details: details
          }, null, 2));
        }
        
        setResult({ error });
        return;
      }
      
      setConnectionStatus('success');
      setResult(details);
      toast.success('בדיקת SMTP הצליחה!');
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

  const sendTestEmail = async (recipient: string) => {
    try {
      setLoading(true);
      resetErrors();
      
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
          details: 'The Edge Function may not be deployed properly or CORS issues'
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

  return {
    loading,
    testLoading,
    result,
    connectionStatus,
    errorDetails,
    networkError,
    activeTab,
    setActiveTab,
    isDevelopment,
    testGmailAuth,
    testSmtpEmail,
    sendTestEmail,
    supabaseFunctionsUrl: getSupabaseFunctionsUrl()
  };
}
