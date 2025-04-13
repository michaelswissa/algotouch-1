
import React, { useState, useEffect } from 'react';
import CardcomOpenFields from './CardcomOpenFields';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OpenFieldsPaymentFormProps {
  planId: string;
  onPaymentComplete: (transactionId: string) => void;
  onPaymentStart?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const OpenFieldsPaymentForm: React.FC<OpenFieldsPaymentFormProps> = ({ 
  planId, 
  onPaymentComplete,
  onPaymentStart,
  onError,
  onCancel 
}) => {
  const { user } = useAuth();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);

  // Check if user already has a subscription when the component mounts
  useEffect(() => {
    const checkExistingSubscription = async () => {
      if (user?.id) {
        try {
          setIsCheckingSubscription(true);
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (error) throw error;
          
          if (data && data.status !== 'cancelled') {
            setHasSubscription(true);
            
            // Check if user is changing plan
            if (data.plan_type !== planId) {
              setIsChangingPlan(true);
            }
          }
        } catch (err) {
          console.error('Error checking subscription:', err);
        } finally {
          setIsCheckingSubscription(false);
        }
      } else {
        setIsCheckingSubscription(false);
      }
    };
    
    checkExistingSubscription();
    
    // Clear any persisting payment sessions
    const cleanUpPaymentSessions = async () => {
      try {
        if (user?.id) {
          await supabase.rpc('cleanup_stale_payment_sessions', { user_id_param: user.id });
        }
      } catch (err) {
        console.error('Error cleaning up payment sessions:', err);
      }
    };
    
    cleanUpPaymentSessions();
  }, [user, planId]);

  // Load the 3DS script when the component mounts
  useEffect(() => {
    const cardcom3DSScript = document.createElement('script');
    const time = new Date().getTime();
    cardcom3DSScript.setAttribute('src', `https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=${time}`);
    document.head.appendChild(cardcom3DSScript);
    
    // Clean up the script when the component unmounts
    return () => {
      if (document.head.contains(cardcom3DSScript)) {
        document.head.removeChild(cardcom3DSScript);
      }
    };
  }, []);

  const handleSuccess = (transactionId: string) => {
    setProcessingPayment(false);
    onPaymentComplete(transactionId);
  };

  const handleError = (error: string) => {
    setProcessingPayment(false);
    if (onError) onError(error);
  };

  const handlePaymentStart = () => {
    setProcessingPayment(true);
    if (onPaymentStart) onPaymentStart();
  };

  // Handle plan change confirmation
  const handlePlanChangeConfirmed = async () => {
    try {
      if (user?.id) {
        // Mark existing subscription as cancelled
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .not('status', 'eq', 'cancelled');
          
        if (error) {
          toast.error('שגיאה בביטול המנוי הקיים');
          return;
        }
        
        toast.success('המנוי הקיים בוטל, כעת תוכל להירשם למנוי חדש');
        setIsChangingPlan(false);
        setHasSubscription(false);
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      toast.error('שגיאה בביטול המנוי הקיים');
    }
  };

  // Get plan details to display in the UI
  const plans = getSubscriptionPlans();
  const plan = plans[planId as keyof typeof plans] || plans.monthly;
  
  if (isCheckingSubscription) {
    return (
      <Card className="max-w-lg mx-auto" dir="rtl">
        <CardContent className="p-6">
          <div className="flex justify-center items-center py-8">
            <div className="h-8 w-8 rounded-full border-4 border-t-primary animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isChangingPlan) {
    return (
      <Card className="max-w-lg mx-auto" dir="rtl">
        <CardHeader>
          <CardTitle>שינוי תכנית מנוי</CardTitle>
          <CardDescription>
            יש לך כבר מנוי פעיל. האם ברצונך לעבור למנוי {plan.name}?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              שינוי המנוי יבטל את המנוי הקיים שלך ויחליף אותו במנוי חדש.
            </AlertDescription>
          </Alert>
          <div className="flex justify-between gap-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              בטל
            </Button>
            <Button onClick={handlePlanChangeConfirmed} className="flex-1">
              אשר שינוי מנוי
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (hasSubscription && !isChangingPlan) {
    return (
      <Card className="max-w-lg mx-auto" dir="rtl">
        <CardHeader>
          <CardTitle>יש לך כבר מנוי פעיל</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              יש לך כבר מנוי פעיל במערכת. אם ברצונך לשנות מנוי, אנא בטל את המנוי הקיים תחילה.
            </AlertDescription>
          </Alert>
          <Button onClick={onCancel} className="w-full">
            חזור
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>
          {planId === 'monthly' 
            ? 'הרשמה למנוי חודשי עם חודש ניסיון חינם' 
            : planId === 'annual' 
              ? 'הרשמה למנוי שנתי עם חיסכון של 25%' 
              : 'רכישת מנוי VIP לכל החיים'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted rounded-md p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{typeof plan.price === 'number' ? `${plan.price} ₪` : plan.price}</p>
              {planId === 'monthly' && <p className="text-xs text-muted-foreground">חודש ראשון: חינם</p>}
            </div>
          </div>
        </div>

        <CardcomOpenFields 
          planId={planId}
          onPaymentComplete={handleSuccess}
          onError={handleError}
          onPaymentStart={handlePaymentStart}
        />
      </CardContent>
    </Card>
  );
};

export default OpenFieldsPaymentForm;
