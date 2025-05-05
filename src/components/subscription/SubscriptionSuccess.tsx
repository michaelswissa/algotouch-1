
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight, LogIn } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import Layout from '@/components/Layout';
import { Spinner } from '@/components/ui/spinner';

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [planDetails, setPlanDetails] = useState<{
    planName: string;
    isRecurring: boolean;
  } | null>(null);
  
  // טיפול בפרמטרים של הפניה מCardCom בעת טעינת העמוד
  useEffect(() => {
    const processRedirectParams = async () => {
      if (searchParams.size > 0) {
        const redirectParams = CardComService.handleRedirectParameters(searchParams);
        
        if (redirectParams.sessionId) {
          PaymentLogger.log('Processing success page redirect params', redirectParams);
          
          try {
            // Fetch plan details from the payment session
            const { data, error } = await supabase.functions.invoke('cardcom-status', {
              body: { 
                sessionId: redirectParams.sessionId,
                forceUpdate: false
              }
            });
            
            if (error) {
              PaymentLogger.error('Error fetching payment details', error);
            } else if (data?.data?.plan_id) {
              // Get plan name based on plan_id
              const planName = data.data.plan_id === 'monthly' 
                ? 'חודשי' 
                : data.data.plan_id === 'annual' 
                  ? 'שנתי' 
                  : data.data.plan_id === 'vip' 
                    ? 'VIP' 
                    : 'בסיסי';
              
              // Determine if the plan is recurring
              const isRecurring = ['monthly', 'annual'].includes(data.data.plan_id);
              
              setPlanDetails({
                planName,
                isRecurring
              });
            }
          } catch (err) {
            PaymentLogger.error('Failed to process payment success details', err);
          } finally {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    
    processRedirectParams();
  }, [searchParams]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  
  return (
    <div className="max-w-lg mx-auto bg-green-50 dark:bg-green-900/20 text-center p-8 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center mb-4">
        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-2">
        הרשמה הושלמה בהצלחה!
      </h2>
      
      <p className="text-green-700 dark:text-green-300 mb-4">
        {planDetails?.isRecurring 
          ? `נרשמת בהצלחה למנוי ${planDetails.planName}. כעת יש לך גישה מלאה למערכת.`
          : planDetails?.planName === 'VIP' 
            ? 'נרשמת בהצלחה למנוי VIP לכל החיים. כעת יש לך גישה מלאה למערכת.'
            : 'ההרשמה הושלמה בהצלחה. כעת יש לך גישה מלאה למערכת.'
        }
      </p>
      
      {!isAuthenticated ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 text-start">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">התחברות למערכת</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
            כדי להתחיל להשתמש במערכת, עליך להתחבר עם כתובת האימייל והסיסמה שבחרת בתהליך ההרשמה.
          </p>
          <Button 
            onClick={() => navigate('/auth', { replace: true })} 
            className="w-full flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            התחבר למערכת
          </Button>
        </div>
      ) : (
        <p className="text-green-600 dark:text-green-400 italic mb-6">
          הנך מחובר למערכת ויכול להתחיל להשתמש בכל האפשרויות.
        </p>
      )}
      
      <Button 
        onClick={() => navigate('/dashboard', { replace: true })} 
        className="gap-2"
      >
        המשך לדף הבית <ChevronRight className="h-4 w-4 -rotate-180" />
      </Button>
    </div>
  );
};

export default SubscriptionSuccess;
