
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface IframePaymentProps {
  planId: string;
  amount: number;
  onSuccess: (paymentData: any) => void;
  onError: (error: Error) => void;
  userId?: string;
  email?: string;
  fullName?: string;
  onBack?: () => void;
}

export const IframePayment: React.FC<IframePaymentProps> = ({
  planId,
  amount,
  onSuccess,
  onError,
  userId,
  email,
  fullName,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createPaymentSession();
  }, []);

  const createPaymentSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate success and failure redirect URLs
      const origin = window.location.origin;
      const successUrl = `${origin}/payment/success?plan=${planId}`;
      const errorUrl = `${origin}/payment/error?plan=${planId}`;
      
      // Determine operation type based on plan
      let operation = "ChargeOnly";
      if (planId === 'monthly') {
        operation = "CreateTokenOnly"; // Token only for monthly (trial)
      } else if (planId === 'annual') {
        operation = "ChargeAndCreateToken"; // Charge + token for annual
      }
      
      // Prepare payload
      const payload = {
        amount,
        operation, 
        successRedirectUrl: successUrl,
        failedRedirectUrl: errorUrl,
        returnValue: userId || 'guest-payment',
        productName: `Subscription - ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
        webHookUrl: `${origin}/api/payment-webhook`,
        language: "he",
        userId,
        email,
        fullName,
        uiDefinition: {
          IsHideCardOwnerName: false,
          CardOwnerNameValue: fullName || '',
          IsHideCardOwnerEmail: false,
          CardOwnerEmailValue: email || '',
          IsHideCardOwnerPhone: false,
          IsHideCardOwnerIdentityNumber: false
        }
      };

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('cardcom-iframe-redirect', {
        body: payload
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        setPaymentUrl(data.url);
      } else {
        throw new Error('Could not generate payment URL');
      }
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      setError(err.message || 'Failed to initialize payment');
      onError(err instanceof Error ? err : new Error(err.message || 'Unknown error'));
      toast.error('שגיאה בהגדרת תהליך התשלום');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-10">
          <Spinner size="lg" />
          <p className="mt-4 text-center">מתחבר למערכת הסליקה...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <div className="text-red-500 mb-4 text-center">
            <p>אירעה שגיאה בהתחברות למערכת הסליקה</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button onClick={createPaymentSession} className="w-full">
              נסה שנית
            </Button>
            {onBack && (
              <Button onClick={onBack} variant="outline" className="w-full">
                חזרה
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentUrl) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-red-500">לא ניתן ליצור קישור לתשלום</p>
          <Button onClick={createPaymentSession} className="mt-4">
            נסה שנית
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-full" dir="rtl">
      <iframe 
        src={paymentUrl} 
        className="w-full border-none" 
        style={{ height: '500px', minHeight: '500px' }}
        title="תשלום מאובטח"
      />
    </div>
  );
};

export default IframePayment;
