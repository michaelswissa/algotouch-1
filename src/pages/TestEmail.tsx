
import React, { useEffect } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmailTest } from '@/hooks/use-email-test';
import DevelopmentWarning from '@/components/email-test/DevelopmentWarning';
import ConnectionStatusAlerts from '@/components/email-test/ConnectionStatusAlerts';
import ConnectionTestCard from '@/components/email-test/ConnectionTestCard';
import SendEmailCard from '@/components/email-test/SendEmailCard';
import NetworkErrorHelp from '@/components/email-test/NetworkErrorHelp';
import ErrorDetailsCard from '@/components/email-test/ErrorDetailsCard';
import ResultCard from '@/components/email-test/ResultCard';

const TestEmail = () => {
  const {
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
    supabaseFunctionsUrl
  } = useEmailTest();

  useEffect(() => {
    // Set up error handling for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      // This error handling is now part of the hook
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <Layout className="py-8" hideSidebar={true}>
      <div className="max-w-4xl mx-auto px-4" dir="rtl">
        <h1 className="text-3xl font-bold mb-8">בדיקת שליחת דוא"ל</h1>
        
        {isDevelopment && <DevelopmentWarning />}
        
        <ConnectionStatusAlerts 
          connectionStatus={connectionStatus}
          networkError={networkError}
          supabaseFunctionsUrl={supabaseFunctionsUrl}
        />
        
        <Tabs defaultValue="smtp" className="mb-6" onValueChange={(value) => setActiveTab(value as 'gmail' | 'smtp')}>
          <TabsList className="grid grid-cols-2 w-full md:w-[400px] mb-4">
            <TabsTrigger value="smtp">SMTP (מומלץ)</TabsTrigger>
            <TabsTrigger value="gmail">Gmail API</TabsTrigger>
          </TabsList>
          
          <TabsContent value="smtp">
            <div className="grid gap-8">
              <ConnectionTestCard
                title="בדיקת חיבור לשירות SMTP"
                description="בדיקה שהגדרות SMTP תקינות וניתן לשלוח מיילים"
                onTest={testSmtpEmail}
                isLoading={testLoading}
                connectionStatus={connectionStatus}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="gmail">
            <div className="grid gap-8">
              <ConnectionTestCard
                title="בדיקת חיבור לשירות Gmail API"
                description="בדיקה שההרשאות והחיבור לשירות Gmail API תקינים"
                onTest={testGmailAuth}
                isLoading={testLoading}
                connectionStatus={connectionStatus}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <SendEmailCard
          title={`שליחת מייל בדיקה (${activeTab === 'gmail' ? 'Gmail API' : 'SMTP'})`}
          description={`שליחת מייל בדיקה באמצעות הפונקציה ${activeTab === 'gmail' ? 'gmail-sender' : 'smtp-sender'}`}
          onSend={sendTestEmail}
          isLoading={loading}
          connectionStatus={connectionStatus}
        />
        
        {networkError && <NetworkErrorHelp networkError={networkError} />}
        
        {errorDetails && (
          <ErrorDetailsCard
            title="פרטי השגיאה"
            errorDetails={errorDetails}
          />
        )}
        
        <ResultCard result={result} />
      </div>
    </Layout>
  );
};

export default TestEmail;
