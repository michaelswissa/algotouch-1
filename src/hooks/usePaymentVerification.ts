
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import { CardcomPayload, CardcomVerifyResponse, CardcomWebhookPayload } from '@/types/payment';

// Define a specific interface for the payment webhook row to avoid deep recursion
interface PaymentWebhookRow {
  payload: CardcomWebhookPayload;
  processed: boolean;
}

interface UsePaymentVerificationProps {
  lowProfileId: string | null;
}

interface PaymentVerificationResult {
  isLoading: boolean;
  error: string | null;
  paymentDetails: any;
}

export function usePaymentVerification({ lowProfileId }: UsePaymentVerificationProps): PaymentVerificationResult {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    async function verifyPayment() {
      try {
        if (!lowProfileId) {
          setError('לא התקבלו נתונים מספיקים מהשרת');
          setIsLoading(false);
          return;
        }

        console.log('Processing payment redirect with LowProfileId:', lowProfileId);

        // Step 1: First check if this payment has already been processed via webhook
        const { data: webhookData, error: webhookError } = await supabase
          .from('payment_webhooks')
          .select('payload, processed')
          .eq('payload->LowProfileId', lowProfileId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!webhookError && webhookData && webhookData.processed) {
          // Payment was already processed by webhook
          const payload = webhookData.payload as CardcomWebhookPayload;
          
          console.log('Payment already processed by webhook:', payload);
          setPaymentDetails({
            source: 'webhook',
            details: payload,
            success: payload.ResponseCode === 0
          });
          
          if (payload.ResponseCode === 0) {
            toast.success('התשלום התקבל בהצלחה!');
            navigate('/dashboard');
          } else {
            setError(payload.Description || 'אירעה שגיאה בתהליך התשלום');
          }
          setIsLoading(false);
          return;
        }

        // Step 2: Call Supabase function to verify payment if webhook hasn't processed it
        const { data, error: functionError } = await supabase.functions.invoke<CardcomVerifyResponse>('verify-cardcom-payment', {
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

    if (lowProfileId) {
      verifyPayment();
    } else {
      setIsLoading(false);
    }
  }, [lowProfileId, navigate]);

  async function verifyCardcomPaymentDirectly(lowProfileId: string) {
    try {
      console.log('Attempting direct verification with CardCom API');
      // Get terminal and API credentials from environment or session storage
      const { data: configData, error: configError } = await supabase.functions.invoke<{
        terminalNumber: string;
        apiName: string;
        hasApiPassword: boolean;
      }>('get-cardcom-config', {
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

      const lpResult = await response.json() as CardcomPayload;
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

  async function saveCardcomPaymentData(paymentData: CardcomPayload) {
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

  return {
    isLoading,
    error,
    paymentDetails
  };
}
