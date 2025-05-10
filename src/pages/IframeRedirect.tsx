
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

// Define interface for CreateLowProfile parameters
interface IframeRedirectProps {
  terminalNumber: number;
  apiName: string;
  operation?: string;
  returnValue?: string;
  amount: number;
  successRedirectUrl: string;
  failedRedirectUrl: string;
  webHookUrl: string;
  productName?: string;
  language?: string;
  isoCoinId?: number;
}

const IframeRedirect: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        // Get payment parameters from URL search params or from state
        const searchParams = new URLSearchParams(location.search);
        const paymentData = location.state?.paymentData || {};
        
        // Merge URL parameters and state data
        const paymentParams: IframeRedirectProps = {
          terminalNumber: parseInt(searchParams.get('terminalNumber') || paymentData.terminalNumber?.toString() || '0'),
          apiName: searchParams.get('apiName') || paymentData.apiName || '',
          amount: parseFloat(searchParams.get('amount') || paymentData.amount?.toString() || '0'),
          successRedirectUrl: searchParams.get('successRedirectUrl') || paymentData.successRedirectUrl || window.location.origin + '/payment/success',
          failedRedirectUrl: searchParams.get('failedRedirectUrl') || paymentData.failedRedirectUrl || window.location.origin + '/payment/error',
          webHookUrl: searchParams.get('webHookUrl') || paymentData.webHookUrl || window.location.origin + '/api/payment-webhook',
          operation: searchParams.get('operation') || paymentData.operation || 'ChargeOnly',
          returnValue: searchParams.get('returnValue') || paymentData.returnValue,
          productName: searchParams.get('productName') || paymentData.productName,
          language: searchParams.get('language') || paymentData.language || 'he',
          isoCoinId: parseInt(searchParams.get('isoCoinId') || paymentData.isoCoinId?.toString() || '1'),
        };
        
        // Validate required parameters
        if (!paymentParams.terminalNumber || !paymentParams.apiName || !paymentParams.amount) {
          throw new Error('Missing required payment parameters');
        }

        console.log('Creating payment iframe with params:', paymentParams);
        
        // Here you would normally call your backend API to create the payment URL
        // For now, we'll simulate a successful response
        const simulatedResponse = {
          url: `https://secure.cardcom.solutions/Interface/LowProfile.aspx?TerminalNumber=${paymentParams.terminalNumber}&APIName=${paymentParams.apiName}&Amount=${paymentParams.amount}&Language=${paymentParams.language}`,
          lowProfileId: 'simulated-low-profile-id'
        };
        
        // In a production environment, you would make an API call instead:
        /*
        const response = await fetch('/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentParams)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create payment');
        }
        
        const data = await response.json();
        */
        
        // Store payment ID in session for later verification
        sessionStorage.setItem('paymentLowProfileId', simulatedResponse.lowProfileId);
        
        // Set the redirect URL
        setRedirectUrl(simulatedResponse.url);
        setLoading(false);
      } catch (err) {
        console.error('Payment initialization error:', err);
        setError((err as Error).message || 'Failed to initialize payment');
        setLoading(false);
      }
    };

    initializePayment();
  }, [location]);

  // Handle manual redirect
  const handleRedirect = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>מעבר לעמוד התשלום</CardTitle>
            <CardDescription>מתחבר למערכת הסליקה, אנא המתן...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <Spinner className="h-16 w-16" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>שגיאה</CardTitle>
            <CardDescription>לא ניתן ליצור את עמוד התשלום</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-red-500">{error}</div>
            <div className="flex justify-center">
              <Button onClick={handleCancel}>חזרה לדף הבית</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auto-redirect after a short delay
  useEffect(() => {
    if (redirectUrl) {
      const timer = setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [redirectUrl]);

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>מעבר לעמוד התשלום</CardTitle>
          <CardDescription>עוברים למערכת הסליקה, לחץ המשך אם אינך מועבר אוטומטית</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Button onClick={handleRedirect}>המשך לתשלום</Button>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleCancel}>ביטול</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IframeRedirect;
