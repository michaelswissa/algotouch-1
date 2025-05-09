
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';

interface CardcomIframeRedirectProps {
  terminalNumber: number;
  apiName: string;
  amount: number;
  successUrl: string;
  errorUrl: string;
  webhookUrl: string;
  productName?: string;
  returnValue?: string;
  language?: string;
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly';
}

const CardcomIframeRedirect: React.FC<CardcomIframeRedirectProps> = ({
  terminalNumber,
  apiName,
  amount,
  successUrl,
  errorUrl,
  webhookUrl,
  productName = 'AlgoTouch Subscription',
  returnValue = '',
  language = 'he',
  operation = 'ChargeAndCreateToken'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createIframeRedirect = async () => {
      try {
        setIsLoading(true);
        
        // Call the iframe-redirect function
        const { data, error } = await supabase.functions.invoke('iframe-redirect', {
          body: {
            terminalNumber,
            apiName,
            amount,
            successUrl,
            failedUrl: errorUrl,
            webhookUrl,
            productName,
            returnValue,
            language,
            operation
          }
        });
        
        if (error) {
          throw new Error(error.message || 'אירעה שגיאה ביצירת עמוד התשלום');
        }
        
        if (data && data.Url) {
          setPaymentUrl(data.Url);
        } else {
          throw new Error('לא התקבל קישור תקין ממערכת הסליקה');
        }
      } catch (err: any) {
        console.error('Error creating iframe redirect:', err);
        setError(err.message || 'אירעה שגיאה ביצירת עמוד התשלום');
        toast.error('שגיאה בהתחברות למערכת הסליקה');
      } finally {
        setIsLoading(false);
      }
    };

    createIframeRedirect();
  }, [terminalNumber, apiName, amount, successUrl, errorUrl, webhookUrl, productName, returnValue, language, operation]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Spinner size="lg" />
          <p className="mt-4 text-center">מתחבר למערכת הסליקה...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-500 mb-4 text-center">
            <p>אירעה שגיאה בהתחברות למערכת הסליקה</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentUrl) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-500">לא ניתן ליצור קישור לתשלום</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-[600px] max-h-[80vh] overflow-hidden rounded-lg shadow-lg border">
      <iframe 
        src={paymentUrl} 
        className="w-full h-full border-none"
        title="תשלום מאובטח"
      />
    </div>
  );
};

export default CardcomIframeRedirect;
