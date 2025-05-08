
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Define interface for payment verification response
interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  data?: {
    paymentData: {
      transactionId: string;
      amount: number;
    }
  };
}

// Define the webhook processing result structure
interface WebhookProcessingResult {
  success: boolean;
  message?: string;
  reason?: string;
}

export default function CardcomRedirectPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<VerifyPaymentResponse | null>(null);

  useEffect(() => {
    async function handleRedirect() {
      try {
        // Parse URL search params to get relevant data
        const searchParams = new URLSearchParams(location.search);
        const lowProfileId = searchParams.get('LowProfileId');
        
        if (!lowProfileId) {
          setError('לא התקבלו נתונים מספיקים מהשרת');
          setIsLoading(false);
          return;
        }

        console.log('Processing payment redirect with LowProfileId:', lowProfileId);

        // Check if we already have this payment recorded in webhooks
        const { data: webhookData, error: webhookError } = await supabase
          .from('payment_webhooks')
          .select('*')
          .eq('processed', true)
          .contains('payload', { LowProfileId: lowProfileId })
          .order('created_at', { ascending: false })
          .limit(1);

        // If webhook already processed this payment, we can just query that result
        if (webhookData && webhookData.length > 0) {
          console.log('Payment already processed by webhook:', webhookData[0]);
          
          // Type assert the processing_result to our expected structure using the safer two-step approach
          const processingResult = (webhookData[0].processing_result as unknown) as WebhookProcessingResult;
          
          // Set payment result based on webhook data
          setPaymentResult({
            success: processingResult.success || false,
            message: processingResult.message || 'Payment processed',
            data: (webhookData[0].processing_result as unknown) as { paymentData: { transactionId: string; amount: number } }
          });
          
          if (processingResult.success) {
            toast.success('התשלום התקבל בהצלחה!');
            navigate('/my-subscription');
            return;
          } else {
            setError(processingResult.reason || 'אירעה שגיאה בתהליך התשלום');
            setIsLoading(false);
            return;
          }
        }

        // FALLBACK: Call Supabase function to verify payment directly from CardCom API
        // This will trigger if the webhook hasn't been received/processed yet
        console.log('No webhook found, calling direct verification with CardCom API');
        
        const { data: rawData, error: functionError } = await supabase.functions.invoke(
          'verify-cardcom-payment',
          { body: { lowProfileId, source: 'redirect-page' } }
        );

        if (functionError) {
          throw new Error(functionError.message);
        }

        // Type assert the response data using the safer two-step approach
        const data = (rawData as unknown) as VerifyPaymentResponse;

        if (data.success) {
          setPaymentResult(data);
          toast.success('התשלום התקבל בהצלחה!');
          // Navigate to success page or dashboard
          navigate('/my-subscription');
        } else {
          setError(data.message || 'אירעה שגיאה בתהליך אימות התשלום');
        }
      } catch (err: any) {
        console.error('Error processing redirect:', err);
        setError('אירעה שגיאה בעת עיבוד נתוני התשלום');
      } finally {
        setIsLoading(false);
      }
    }

    handleRedirect();
  }, [location, navigate]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>שגיאה בתהליך התשלום</CardTitle>
            <CardDescription>לא ניתן היה לאמת את התשלום</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/subscription')}>חזרה לדף התשלום</Button>
            <Button onClick={() => navigate('/dashboard')}>חזרה לדף הבית</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>התשלום התקבל בהצלחה!</CardTitle>
          <CardDescription>תודה על הצטרפותך</CardDescription>
        </CardHeader>
        <CardContent>
          <p>פרטי העסקה נשמרו במערכת.</p>
          {paymentResult?.data?.paymentData && (
            <div className="mt-2 text-sm text-muted-foreground">
              <p>מספר עסקה: {paymentResult.data.paymentData.transactionId}</p>
              <p>סכום: {paymentResult.data.paymentData.amount} ₪</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/my-subscription')} className="w-full">
            צפייה במנוי שלי
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
