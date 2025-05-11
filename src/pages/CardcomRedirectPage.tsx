
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';

export default function CardcomRedirectPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

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

        // Step 1: First check if this payment has already been processed via webhook
        // by checking the payment_webhooks table
        const { data: webhookData, error: webhookError } = await supabase
          .from('payment_webhooks')
          .select('*')
          .eq('payload->LowProfileId', lowProfileId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!webhookError && webhookData && webhookData.processed) {
          // Payment was already processed by webhook
          console.log('Payment already processed by webhook:', webhookData);
          setPaymentDetails({
            source: 'webhook',
            details: webhookData.payload,
            success: webhookData.payload?.ResponseCode === 0
          });
          
          if (webhookData.payload?.ResponseCode === 0) {
            toast.success('התשלום התקבל בהצלחה!');
            navigate('/dashboard');
          } else {
            setError(webhookData.payload?.Description || 'אירעה שגיאה בתהליך התשלום');
          }
          setIsLoading(false);
          return;
        }

        // Step 2: Call Supabase function to verify payment if webhook hasn't processed it
        const { data, error: functionError } = await supabase.functions.invoke('verify-cardcom-payment', {
          body: { lowProfileId }
        });

        if (functionError) {
          console.error('Error calling verify-cardcom-payment:', functionError);
          // Fallback: Call the CardCom API directly as last resort
          await verifyCardcomPaymentDirectly(lowProfileId);
          return;
        }

        if (data?.success) {
          setPaymentDetails({
            source: 'edge-function',
            details: data,
            success: true
          });
          toast.success('התשלום התקבל בהצלחה!');
          // Navigate to success page or dashboard
          navigate('/dashboard');
        } else {
          setError(data?.message || 'אירעה שגיאה בתהליך אימות התשלום');
        }
      } catch (err: any) {
        console.error('Error processing redirect:', err);
        setError('אירעה שגיאה בעת עיבוד נתוני התשלום');
      } finally {
        setIsLoading(false);
      }
    }

    async function verifyCardcomPaymentDirectly(lowProfileId: string) {
      try {
        console.log('Attempting direct verification with CardCom API');
        // Get terminal and API credentials from environment or session storage
        const { data: configData, error: configError } = await supabase.functions.invoke('get-cardcom-config', {
          body: {}
        });

        if (configError || !configData?.terminalNumber || !configData?.apiName) {
          throw new Error('Unable to retrieve CardCom configuration');
        }

        // Call the CardCom API to verify the payment directly
        const response = await fetch('https://secure.cardcom.solutions/api/v1/LowProfile/GetLpResult', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            TerminalNumber: configData.terminalNumber,
            ApiName: configData.apiName,
            LowProfileId: lowProfileId
          })
        });

        const lpResult = await response.json();
        console.log('Direct CardCom API response:', lpResult);
        
        if (lpResult.ResponseCode === 0) {
          // Save the result to our database
          await saveCardcomPaymentData(lpResult);
          
          setPaymentDetails({
            source: 'direct-api',
            details: lpResult,
            success: true
          });
          
          toast.success('התשלום התקבל בהצלחה!');
          navigate('/dashboard');
        } else {
          setError(lpResult.Description || 'אירעה שגיאה באימות התשלום');
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Error in direct CardCom verification:', error);
        setError('שגיאה באימות התשלום מול שרת הסליקה');
        setIsLoading(false);
      }
    }

    async function saveCardcomPaymentData(paymentData: any) {
      try {
        const userId = paymentData.ReturnValue;
        
        // Save payment data for user
        if (userId && !userId.startsWith('temp_')) {
          // Process data like the webhook would
          await supabase.functions.invoke('process-payment-data', {
            body: {
              paymentData,
              userId,
              source: 'redirect-fallback'
            }
          });
        }
      } catch (error) {
        console.error('Error saving payment data:', error);
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
          {paymentDetails && (
            <div className="mt-2 text-sm text-muted-foreground">
              <p>מקור האימות: {paymentDetails.source}</p>
              {paymentDetails.details?.TranzactionId && (
                <p>מזהה עסקה: {paymentDetails.details.TranzactionId}</p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            המשך לדף הבית
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
