
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionFailed: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const processFailedPayment = async () => {
      if (searchParams) {
        const redirectParams = CardComService.handleRedirectParameters(searchParams);
        
        if (redirectParams.sessionId) {
          PaymentLogger.log('Processing failed payment redirect params', redirectParams);
          
          try {
            await supabase.functions.invoke('cardcom-status', {
              body: { 
                sessionId: redirectParams.sessionId,
                forceUpdate: true,
                status: 'failed'
              }
            });
            
            PaymentLogger.log('Successfully updated payment status to failed in database');
          } catch (err) {
            PaymentLogger.error('Failed to update payment status', err);
          }
        }
      }
    };
    
    processFailedPayment();
  }, [searchParams]);
  
  return (
    <div className="max-w-md mx-auto bg-red-50 dark:bg-red-900/20 text-center p-8 rounded-xl border border-red-200 dark:border-red-800">
      <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-800/30 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-red-800 dark:text-red-400 mb-2">
        התשלום נכשל
      </h2>
      <p className="text-red-700 dark:text-red-300 mb-6">
        לצערנו, לא הצלחנו לעבד את התשלום. אנא נסה שוב או בחר שיטת תשלום אחרת.
      </p>
      <div className="flex flex-col gap-3">
        <Button onClick={() => navigate('/subscription')} variant="destructive" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> חזרה לעמוד ההרשמה
        </Button>
        <Button onClick={() => navigate('/dashboard')} variant="outline">
          המשך לדף הבית
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionFailed;
