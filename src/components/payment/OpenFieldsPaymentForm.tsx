
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CardcomOpenFields from './CardcomOpenFields';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

interface OpenFieldsPaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onCancel: () => void;
}

const OpenFieldsPaymentForm: React.FC<OpenFieldsPaymentFormProps> = ({
  planId,
  onPaymentComplete,
  onCancel
}) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get plan details from helper
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  const handlePaymentSuccess = async (transactionId: string) => {
    if (!transactionId) {
      toast.error('חסר מזהה עסקה');
      return;
    }
    
    setProcessing(true);
    
    try {
      // If user is already authenticated, update subscription
      if (user) {
        await handleAuthenticatedPaymentSuccess(transactionId);
      } 
      // Registration was handled by the webhook, just show success
      else {
        toast.success('ההרשמה הושלמה בהצלחה!');
        
        // Clear registration data from session storage since it's been processed
        sessionStorage.removeItem('registration_data');
      }
      
      // Complete the payment process
      onPaymentComplete();
      
    } catch (error) {
      console.error('Error processing payment success:', error);
      toast.error('שגיאה בעיבוד התשלום');
      setError(error instanceof Error ? error.message : 'שגיאה בעיבוד התשלום');
    } finally {
      setProcessing(false);
    }
  };

  const handleAuthenticatedPaymentSuccess = async (transactionId: string) => {
    if (!user) {
      const error = new Error('נדרש להיות מחובר כדי לסיים את התהליך');
      toast.error(error.message);
      throw error;
    }

    try {
      // Update user's subscription in the database
      const now = new Date();
      let periodEndsAt = null;
      let trialEndsAt = null;
      
      if (planId === 'monthly') {
        trialEndsAt = new Date(now);
        trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
      } else if (planId === 'annual') {
        periodEndsAt = new Date(now);
        periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
      }
      
      // Update subscription in database
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan_type: planId,
          status: planId === 'monthly' ? 'trial' : 'active',
          trial_ends_at: trialEndsAt?.toISOString() || null,
          current_period_ends_at: periodEndsAt?.toISOString() || null,
          payment_method: {
            type: 'card', 
            provider: 'cardcom',
            last_transaction_id: transactionId
          },
          contract_signed: true,
          contract_signed_at: now.toISOString()
        });
      
      if (subscriptionError) {
        throw new Error(`שגיאה בעדכון מנוי: ${subscriptionError.message}`);
      }
      
      // Record payment history
      const { error: paymentError } = await supabase
        .from('payment_history')
        .insert({
          user_id: user.id,
          subscription_id: user.id, // Using user ID as subscription ID
          amount: plan.price,
          currency: 'ILS',
          status: 'completed',
          provider: 'cardcom',
          transaction_id: transactionId,
          payment_method: {
            type: 'card',
            provider: 'cardcom'
          }
        });
      
      if (paymentError) {
        console.error('Error recording payment history:', paymentError);
        // Continue anyway since subscription was created
      }
      
      toast.success('התשלום התקבל בהצלחה!');
      
    } catch (error: any) {
      console.error('Error processing successful payment:', error);
      toast.error(error.message || 'שגיאה בעיבוד התשלום');
      setError(error.message || 'שגיאה בעיבוד התשלום');
      throw error;
    }
  };

  const handlePaymentError = (errorMsg: string) => {
    console.error('Payment error:', errorMsg);
    toast.error(`שגיאה בתהליך התשלום: ${errorMsg}`);
    setError(errorMsg);
  };

  return (
    <Card className="w-full shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {processing ? (
          <div className="flex flex-col items-center justify-center p-8">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="mt-4">מעבד את התשלום...</p>
          </div>
        ) : (
          <CardcomOpenFields
            planId={planId}
            planName={plan.name}
            amount={plan.price}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={onCancel}
          />
        )}
        
        {error && (
          <div className="p-4 text-center">
            <Button 
              variant="outline" 
              onClick={onCancel} 
              disabled={processing}
              className="mt-4"
            >
              בחר אמצעי תשלום אחר
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OpenFieldsPaymentForm;
