
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { Spinner } from '@/components/ui/spinner';
import { CardComService } from '@/services/payment/CardComService';
import { supabase } from '@/integrations/supabase/client';

const PaymentRedirectPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('מעבד את פרטי התשלום...');
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');

  useEffect(() => {
    // Process the response from CardCom
    const processRedirect = async () => {
      try {
        // Parse the URL parameters
        const redirectParams = CardComService.handleRedirectParameters(searchParams);
        
        PaymentLogger.log('Processing payment redirect', redirectParams);
        
        if (!redirectParams.sessionId) {
          setMessage('שגיאה: חסר מזהה עסקה');
          setStatus('failed');
          return;
        }
        
        // Determine if it's a success or failure based on the URL
        const isSuccess = window.location.pathname.includes('success');
        const isFailed = window.location.pathname.includes('failed');
        
        if (isSuccess || redirectParams.status === 'success') {
          setStatus('success');
          setMessage('התשלום הושלם בהצלחה, מעביר לדף הבא...');
          
          // Update the payment status in the database
          await supabase.functions.invoke('cardcom-status', {
            body: { 
              sessionId: redirectParams.sessionId,
              forceUpdate: true,
              status: 'success'
            }
          });
          
          // Redirect to the success page after a short delay
          setTimeout(() => {
            navigate('/subscription/success', { 
              replace: true,
              state: { fromPayment: true }
            });
          }, 1500);
        }
        else if (isFailed || redirectParams.status === 'failed') {
          setStatus('failed');
          setMessage('התשלום נכשל, מחזיר לדף התשלום...');
          
          // Update status in database
          await supabase.functions.invoke('cardcom-status', {
            body: { 
              sessionId: redirectParams.sessionId,
              forceUpdate: true,
              status: 'failed'
            }
          });
          
          // Redirect back to payment page after a short delay
          setTimeout(() => {
            navigate('/subscription', { 
              replace: true,
              state: { paymentFailed: true }
            });
          }, 1500);
        }
        else {
          // Status unknown, check with the server
          const { data, error } = await supabase.functions.invoke('cardcom-status', {
            body: { sessionId: redirectParams.sessionId }
          });
          
          if (error) {
            throw new Error(`Error checking payment status: ${error.message}`);
          }
          
          if (data?.data?.status === 'success') {
            setStatus('success');
            setMessage('התשלום הושלם בהצלחה, מעביר לדף הבא...');
            
            // Redirect to success page
            setTimeout(() => {
              navigate('/subscription/success', { 
                replace: true,
                state: { fromPayment: true }
              });
            }, 1500);
          } else {
            setStatus('failed');
            setMessage('לא ניתן לאמת את סטטוס התשלום, מחזיר לדף התשלום...');
            
            // Redirect back to payment
            setTimeout(() => {
              navigate('/subscription', { replace: true });
            }, 1500);
          }
        }
      } catch (error) {
        PaymentLogger.error('Error processing payment redirect:', error);
        setStatus('failed');
        setMessage('אירעה שגיאה בעיבוד התשלום, מחזיר לדף התשלום...');
        
        // Redirect back to payment
        setTimeout(() => {
          navigate('/subscription', { replace: true });
        }, 2000);
      }
    };
    
    processRedirect();
  }, [searchParams, navigate]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md text-center">
        <Spinner className={`h-12 w-12 mx-auto ${status === 'failed' ? 'text-destructive' : status === 'success' ? 'text-green-500' : 'text-primary'}`} />
        <p className="text-xl font-medium">{message}</p>
      </div>
    </div>
  );
};

export default PaymentRedirectPage;
