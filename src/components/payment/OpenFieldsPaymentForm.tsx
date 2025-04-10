
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CardcomOpenFields from './CardcomOpenFields';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  
  // Get plan details from helper
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Check for registration data in session storage on component mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        setRegistrationData(JSON.parse(storedData));
      } catch (error) {
        console.error('Error parsing registration data:', error);
      }
    }
  }, []);

  const handlePaymentSuccess = async (transactionId: string) => {
    // If registering (not logged in), create the user first
    if (registrationData && !user) {
      await handleRegistrationPaymentSuccess(transactionId);
    } 
    // User is already authenticated, just update subscription
    else if (user) {
      await handleAuthenticatedPaymentSuccess(transactionId);
    }
    // Something is wrong, we don't have either user or registration data
    else {
      toast.error('שגיאה בעיבוד התשלום - מידע משתמש חסר');
      return;
    }
  };

  const handleRegistrationPaymentSuccess = async (transactionId: string) => {
    setProcessing(true);
    
    try {
      console.log('Processing registration payment success for transaction:', transactionId);
      
      // The cardcom-openfields edge function already stored the registration data
      // Now we just need to notify the user and move them to the success screen
      toast.success('ההרשמה הושלמה בהצלחה!');
      
      // Clear registration data from session storage since it's been processed
      sessionStorage.removeItem('registration_data');
      
      // Complete the payment flow
      onPaymentComplete();
      
    } catch (error: any) {
      console.error('Error completing registration:', error);
      toast.error(error.message || 'שגיאה בהשלמת תהליך ההרשמה');
    } finally {
      setProcessing(false);
    }
  };

  const handleAuthenticatedPaymentSuccess = async (transactionId: string) => {
    if (!user) {
      toast.error('נדרש להיות מחובר כדי לסיים את התהליך');
      return;
    }

    setProcessing(true);
    
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
      
      // Complete the payment process
      toast.success('התשלום התקבל בהצלחה!');
      onPaymentComplete();
      
    } catch (error: any) {
      console.error('Error processing successful payment:', error);
      toast.error(error.message || 'שגיאה בעיבוד התשלום');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    toast.error(`שגיאה בתהליך התשלום: ${error}`);
  };

  return (
    <Card className="w-full shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <CardcomOpenFields
          planId={planId}
          planName={plan.name}
          amount={plan.price}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={onCancel}
        />
      </CardContent>
    </Card>
  );
};

export default OpenFieldsPaymentForm;
