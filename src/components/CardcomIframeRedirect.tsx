
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

interface CardcomIframeRedirectProps {
  terminalNumber: number;
  apiName: string;
  amount: number;
  successUrl: string;
  errorUrl: string;
  webhookUrl: string;
  productName?: string;
  language?: string;
  returnValue?: string;
}

const CardcomIframeRedirect: React.FC<CardcomIframeRedirectProps> = ({
  terminalNumber,
  apiName,
  amount,
  successUrl,
  errorUrl,
  webhookUrl,
  productName = 'AlgoTouch Subscription',
  language = 'he',
  returnValue = ''
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const createLowProfile = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/iframe-redirect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            terminalNumber,
            apiName,
            amount,
            successUrl,
            failedUrl: errorUrl,
            webhookUrl,
            productName,
            language,
            returnValue
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment page');
        }

        const data = await response.json();
        
        if (data.ResponseCode !== 0) {
          throw new Error(data.Description || 'Error creating payment page');
        }
        
        setRedirectUrl(data.Url);
        
        // Automatically redirect after a brief delay
        setTimeout(() => {
          window.location.href = data.Url;
        }, 1500);
        
      } catch (error) {
        console.error('Payment initialization error:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    createLowProfile();
  }, [terminalNumber, apiName, amount, successUrl, errorUrl, webhookUrl, productName, language, returnValue]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-4 text-red-500">שגיאה בהפניה לדף התשלום</h2>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 text-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <Spinner size="lg" />
            <p className="text-lg">מפנה לדף התשלום...</p>
          </div>
        ) : redirectUrl ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-lg">מפנה לדף התשלום...</p>
            <a href={redirectUrl} className="text-primary hover:underline">לחץ כאן אם אינך מועבר אוטומטית</a>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default CardcomIframeRedirect;
