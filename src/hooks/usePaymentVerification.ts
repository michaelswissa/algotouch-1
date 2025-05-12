import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import { CardcomPayload, CardcomVerifyResponse, CardcomWebhookPayload } from '@/types/payment';
import { PaymentLogger } from '@/services/logging/paymentLogger';
import { PaymentMonitor } from '@/services/monitoring/paymentMonitor';
import { PaymentWebhookRow } from '@/types/payment-logs';

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
          PaymentLogger.warning('Missing LowProfileId in payment verification', 'payment-verification');
          setError('לא התקבלו נתונים מספיקים מהשרת');
          setIsLoading(false);
          return;
        }

        const tracking = PaymentMonitor.startTracking(lowProfileId);
        PaymentMonitor.logVerificationAttempt(lowProfileId, 'redirect');
        PaymentLogger.info('Processing payment redirect', 'payment-verification', { lowProfileId });

        // Step 1: First check if this payment has already been processed via webhook
        const { data: webhookData, error: webhookError } = await supabase
          .from('payment_webhooks')
          .select('payload, processed')
          .filter('payload->>LowProfileId', 'eq', lowProfileId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!webhookError && webhookData && webhookData.processed) {
          // Payment was already processed by webhook
          // We need to safely cast the payload to our expected type
          const payload = webhookData.payload as unknown as CardcomWebhookPayload;
          
          PaymentLogger.info('Payment already processed by webhook', 'payment-verification', { 
            lowProfileId, 
            responseCode: payload.ResponseCode
          }, payload.ReturnValue);
          
          setPaymentDetails({
            source: 'webhook',
            details: payload,
            success: payload.ResponseCode === 0
          });
          
          if (payload.ResponseCode === 0) {
            PaymentMonitor.logVerificationSuccess(lowProfileId, 'webhook-record', payload, payload.ReturnValue);
            toast.success('התשלום התקבל בהצלחה!');
            navigate('/dashboard');
          } else {
            PaymentMonitor.logVerificationFailure(lowProfileId, 'webhook-record', {
              code: payload.ResponseCode,
              message: payload.Description
            }, payload.ReturnValue);
            setError(payload.Description || 'אירעה שגיאה בתהליך התשלום');
          }
          tracking.endTracking();
          setIsLoading(false);
          return;
        }

        // Step 2: Call Supabase function to verify payment if webhook hasn't processed it
        PaymentLogger.info('Attempting verification via edge function', 'payment-verification', { lowProfileId });
        const { data, error: functionError } = await supabase.functions.invoke<CardcomVerifyResponse>('verify-cardcom-payment', {
          body: { lowProfileId }
        });

        if (functionError) {
          PaymentLogger.error('Error calling verify-cardcom-payment edge function', 'payment-verification', { 
            lowProfileId, 
            error: functionError 
          });
          
          // Fallback: Call the CardCom API directly as last resort
          await verifyCardcomPaymentDirectly(lowProfileId);
          tracking.endTracking();
          return;
        }

        if (data?.success) {
          PaymentMonitor.logVerificationSuccess(lowProfileId, 'edge-function', data, data.registrationId);
          setPaymentDetails({
            source: 'edge-function',
            details: data,
            success: true
          });
          toast.success('התשלום התקבל בהצלחה!');
          // Navigate to success page or dashboard
          navigate('/dashboard');
        } else {
          PaymentMonitor.logVerificationFailure(lowProfileId, 'edge-function', {
            message: data?.message || 'Unknown error',
            details: data?.error
          });
          setError(data?.message || 'אירעה שגיאה בתהליך אימות התשלום');
        }
        tracking.endTracking();
      } catch (err: any) {
        PaymentLogger.error('Exception during payment verification', 'payment-verification', {
          lowProfileId,
          error: err?.message || String(err)
        });
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
    PaymentLogger.info('Attempting direct CardCom API verification', 'direct-api', { lowProfileId });
    try {
      // Get terminal and API credentials from environment or session storage
      const { data: configData, error: configError } = await supabase.functions.invoke<{
        terminalNumber: string;
        apiName: string;
        hasApiPassword: boolean;
      }>('get-cardcom-config', {
        body: {}
      });

      if (configError || !configData?.terminalNumber || !configData?.apiName) {
        const errorMessage = 'Unable to retrieve CardCom configuration';
        PaymentLogger.error(errorMessage, 'direct-api', { lowProfileId, error: configError });
        throw new Error(errorMessage);
      }

      // Call the CardCom API to verify the payment directly
      PaymentLogger.info('Calling CardCom API directly', 'direct-api', { 
        lowProfileId, 
        terminalNumber: configData.terminalNumber 
      });
      
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
      PaymentLogger.info('Received CardCom API response', 'direct-api', { 
        lowProfileId, 
        responseCode: lpResult.ResponseCode,
        description: lpResult.Description
      }, lpResult.ReturnValue);
      
      if (lpResult.ResponseCode === 0) {
        // Save the result to our database
        await saveCardcomPaymentData(lpResult);
        PaymentMonitor.logVerificationSuccess(lowProfileId, 'direct-api', lpResult, lpResult.ReturnValue);
        
        setPaymentDetails({
          source: 'direct-api',
          details: lpResult,
          success: true
        });
        
        toast.success('התשלום התקבל בהצלחה!');
        navigate('/dashboard');
      } else {
        PaymentMonitor.logVerificationFailure(lowProfileId, 'direct-api', {
          code: lpResult.ResponseCode,
          message: lpResult.Description
        }, lpResult.ReturnValue);
        
        setError(lpResult.Description || 'אירעה שגיאה באימות התשלום');
        setIsLoading(false);
      }
    } catch (error: any) {
      PaymentLogger.error('Exception during direct CardCom verification', 'direct-api', {
        lowProfileId,
        error: error?.message || String(error)
      });
      
      setError('שגיאה באימות התשלום מול שרת הסליקה');
      setIsLoading(false);
    }
  }

  async function saveCardcomPaymentData(paymentData: CardcomPayload) {
    const userId = paymentData.ReturnValue;
    
    try {
      // Save payment data for user
      if (userId && !userId.startsWith('temp_')) {
        PaymentLogger.info('Saving payment data', 'data-storage', { 
          lowProfileId: paymentData.LowProfileId 
        }, userId);
        
        // Process data like the webhook would
        await supabase.functions.invoke('process-payment-data', {
          body: {
            paymentData,
            userId,
            source: 'redirect-fallback'
          }
        });
        
        PaymentLogger.success('Payment data saved successfully', 'data-storage', { 
          lowProfileId: paymentData.LowProfileId,
          transactionId: paymentData.TranzactionId
        }, userId, paymentData.TranzactionId?.toString());
      }
    } catch (error: any) {
      PaymentLogger.error('Error saving payment data', 'data-storage', {
        lowProfileId: paymentData.LowProfileId,
        error: error?.message || String(error)
      }, userId);
    }
  }

  return {
    isLoading,
    error,
    paymentDetails
  };
}
