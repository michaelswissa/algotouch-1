
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { supabase } from '@/integrations/supabase/client';
import config from '@/config/cardcom-config';

const CardComRedirectPage: React.FC = () => {
  const { planId = 'monthly' } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeCardComPayment = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get contract data for the customer from your application
        const contractData = {
          email: "customer@example.com", // Replace with actual user data
          fullName: "Customer Name",
          phone: "0501234567",
          idNumber: "123456789"
        };
        
        // Prepare necessary parameters for the CardCom payment
        const params = {
          TerminalNumber: config.terminalNumber, // Production terminal number: 160138
          ApiName: config.apiName, // "bLaocQRMSnwphQRUVG3b"
          Operation: "ChargeOnly", // 1 - Regular transaction
          Amount: 10.99, // Replace with actual amount based on planId
          CoinId: 1, // ILS
          Language: "he",
          SuccessRedirectUrl: `${window.location.origin}/payment/success`,
          FailedRedirectUrl: `${window.location.origin}/payment/failed`, 
          WebHookUrl: `${window.location.origin}/api/cardcom-webhook`,
          ProductName: `Plan ${planId}`,
          UIDefinition: {
            CardOwnerNameValue: contractData.fullName,
            CardOwnerEmailValue: contractData.email,
            CardOwnerPhoneValue: contractData.phone,
            CardOwnerIdValue: contractData.idNumber,
          }
        };
        
        PaymentLogger.log('Initializing CardCom payment', { planId });
        
        // Call the edge function to create a CardCom payment session
        const { data, error } = await supabase.functions.invoke('cardcom-json-create', {
          body: {
            planId,
            userId: null, // Replace with actual user ID if available
            email: contractData.email,
            fullName: contractData.fullName,
            phone: contractData.phone,
            idNumber: contractData.idNumber
          }
        });
        
        if (error) {
          throw new Error(`Failed to initialize payment: ${error.message}`);
        }
        
        if (!data?.success || !data?.data) {
          throw new Error('Invalid response from payment service');
        }
        
        // Set the iframe URL received from CardCom
        setIframeUrl(data.data.url || data.data.iframeUrl);
        setIsLoading(false);
        
        PaymentLogger.log('Payment initialization successful', {
          iframeUrl: data.data.url,
          sessionId: data.data.sessionId
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        setIsLoading(false);
        toast.error(errorMessage);
        PaymentLogger.error('Error initializing payment', error);
      }
    };
    
    initializeCardComPayment();
  }, [planId, navigate]);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    window.location.reload();
  };

  return (
    <Layout className="py-8" hideSidebar={true}>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>תשלום מאובטח</CardTitle>
          <CardDescription>מערכת סליקה מאובטחת של CardCom</CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <Spinner className="h-8 w-8" />
              <p>מתחבר למערכת התשלומים...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <p className="text-destructive">{error}</p>
              <Button onClick={handleRetry}>נסה שנית</Button>
            </div>
          ) : iframeUrl ? (
            <div className="space-y-4">
              <div className="rounded-lg border overflow-hidden relative w-full" style={{ height: '600px' }}>
                <iframe
                  src={iframeUrl}
                  title="CardCom Payment"
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ border: 'none' }}
                  allow="payment"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
                ></iframe>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center text-sm text-muted-foreground">
                <p>🔒 מערכת התשלום מאובטחת לחלוטין. פרטי כרטיס האשראי שלך אינם נשמרים במערכת.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <p>לא ניתן להציג את עמוד התשלום, אנא נסה שנית.</p>
              <Button onClick={handleRetry}>נסה שנית</Button>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            חזרה
          </Button>
        </CardFooter>
      </Card>
    </Layout>
  );
};

export default CardComRedirectPage;
