
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // טיפול בפרמטרים של הפניה מCardCom בעת טעינת העמוד
  useEffect(() => {
    const processRedirectParams = async () => {
      if (searchParams) {
        const redirectParams = CardComService.handleRedirectParameters(searchParams);
        
        if (redirectParams.sessionId) {
          PaymentLogger.log('Processing success page redirect params', redirectParams);
          
          // עדכון הסטטוס במסד הנתונים
          try {
            await supabase.functions.invoke('cardcom-status', {
              body: { 
                sessionId: redirectParams.sessionId,
                forceUpdate: true,
                status: redirectParams.status === 'success' ? 'success' : 'failed'
              }
            });
            
            PaymentLogger.log('Successfully updated payment status in database');
          } catch (err) {
            PaymentLogger.error('Failed to update payment status', err);
          }
        }
      }
    };
    
    processRedirectParams();
  }, [searchParams]);
  
  return (
    <div className="max-w-md mx-auto bg-green-50 dark:bg-green-900/20 text-center p-8 rounded-xl border border-green-200 dark:border-green-800">
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center mb-4">
        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-2">
        הרשמה הושלמה בהצלחה!
      </h2>
      <p className="text-green-700 dark:text-green-300 mb-6">
        ברכות! נרשמת בהצלחה לתקופת ניסיון חינם. כעת יש לך גישה מלאה למערכת.
      </p>
      <Button onClick={() => navigate('/dashboard', { replace: true })} className="gap-2">
        המשך לדף הבית <ChevronRight className="h-4 w-4 -rotate-180" />
      </Button>
    </div>
  );
};

export default SubscriptionSuccess;
