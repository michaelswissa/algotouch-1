
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import ErrorBoundary from '@/components/ErrorBoundary';

interface PaymentFormProps {
  terminalNumber: number;
  apiName: string;
  amount: number;
  successRedirectUrl: string;
  failedRedirectUrl: string;
  webHookUrl: string;
  operation?: string;
  productName?: string;
  language?: string;
  returnValue?: string;
}

const IframeRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createLowProfilePayment = async () => {
      try {
        setIsLoading(true);
        
        // Parse payment parameters from URL
        const terminalNumber = Number(searchParams.get('terminalNumber') || 0);
        const apiName = searchParams.get('apiName') || '';
        const amount = Number(searchParams.get('amount') || 0);
        const returnValue = searchParams.get('returnValue') || '';
        
        // Base host for redirects
        const host = window.location.origin;
        
        // Required parameters validation
        if (!terminalNumber || !apiName || !amount) {
          setError('חסרים פרמטרים נדרשים לביצוע התשלום');
          setIsLoading(false);
          return;
        }

        const paymentData: PaymentFormProps = {
          terminalNumber,
          apiName,
          amount,
          successRedirectUrl: `${host}/payment/success`,
          failedRedirectUrl: `${host}/payment/failed`,
          webHookUrl: `${host}/api/payment/webhook`,
          operation: searchParams.get('operation') || 'ChargeOnly',
          productName: searchParams.get('productName') || 'הזמנה',
          language: searchParams.get('language') || 'he',
          returnValue
        };
        
        // Mock API call - in production this should call your backend
        console.log('Creating payment with parameters:', paymentData);
        
        // Simulate API response with a redirect URL
        // In production, this would be the actual Cardcom iframe URL returned from your API
        setTimeout(() => {
          const mockIframeUrl = `https://secure.cardcom.solutions/External/LowProfile.aspx?LowProfileId=${btoa(JSON.stringify(paymentData))}`;
          setIframeUrl(mockIframeUrl);
          setIsLoading(false);
        }, 1500);
        
      } catch (error) {
        console.error('Error creating payment:', error);
        setError('אירעה שגיאה בעת יצירת העסקה');
        setIsLoading(false);
      }
    };

    createLowProfilePayment();
  }, [searchParams, navigate]);

  const handleBack = () => {
    navigate(-1);
  };

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">שגיאה בעיבוד התשלום</CardTitle>
              <CardDescription className="text-center">{error}</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={handleBack}>חזור</Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <ErrorBoundary fallback={
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">שגיאה בטעינת עמוד התשלום</CardTitle>
              <CardDescription className="text-center">אירעה שגיאה בטעינת עמוד התשלום. אנא נסו שוב מאוחר יותר.</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={() => window.location.reload()}>נסה שוב</Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    }>
      <Layout>
        <div className="flex flex-col items-center justify-center h-full">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Spinner size="lg" />
              <p>מעבד תשלום...</p>
            </div>
          ) : iframeUrl ? (
            <div className="w-full max-w-4xl h-[80vh]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">מסך תשלום</CardTitle>
                  <CardDescription className="text-center">אנא השלימו את פרטי התשלום במסך שנטען</CardDescription>
                </CardHeader>
                <CardContent>
                  <iframe 
                    src={iframeUrl}
                    className="w-full h-[600px] border-none"
                    title="Payment Form"
                  />
                </CardContent>
                <CardFooter className="flex justify-center">
                  <Button variant="outline" onClick={handleBack}>ביטול</Button>
                </CardFooter>
              </Card>
            </div>
          ) : (
            <div className="text-center">
              <p className="mb-4">לא ניתן לטעון את עמוד התשלום</p>
              <Button onClick={handleBack}>חזור</Button>
            </div>
          )}
        </div>
      </Layout>
    </ErrorBoundary>
  );
};

export default IframeRedirect;
