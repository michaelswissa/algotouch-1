
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import our components
import SubscriptionCard from './subscription/SubscriptionCard';
import SubscriptionStatus from './subscription/SubscriptionStatus';
import BillingInfo from './subscription/BillingInfo';
import PaymentMethodInfo from './subscription/PaymentMethodInfo';
import SubscriptionFooter from './subscription/SubscriptionFooter';
import LoadingSkeleton from './subscription/LoadingSkeleton';

const UserSubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, loading, details, refetchSubscription } = useSubscription();
  const [isChecking, setIsChecking] = useState(false);
  const [checkingMessage, setCheckingMessage] = useState('');

  useEffect(() => {
    // Check if there's a payment session that needs to be processed
    const checkPendingPayments = async () => {
      if (!user?.id) return;
      
      setIsChecking(true);
      setCheckingMessage('מאמת את פרטי המנוי שלך...');
      
      try {
        // Find any pending payment sessions for this user
        const { data: sessions } = await supabase
          .from('payment_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        // Check for successful payment logs
        const { data: paymentLogs } = await supabase
          .from('user_payment_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1);
        
        // Check if we have a successful payment but no active subscription
        if (paymentLogs?.length && !subscription) {
          setCheckingMessage('נמצא תשלום מוצלח, יוצר מנוי...');
          
          const paymentLog = paymentLogs[0];
          const planType = sessions?.[0]?.plan_id || 'monthly';
          
          // Create subscription record
          const now = new Date();
          let periodEnd = null;
          let trialEnd = null;
          
          if (planType === 'monthly') {
            // Set a 30-day trial for monthly plans
            trialEnd = new Date(now);
            trialEnd.setDate(trialEnd.getDate() + 30);
          } else if (planType === 'annual') {
            // Set 1-year period for annual plans
            periodEnd = new Date(now);
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          }
          
          let paymentMethod = {
            type: "credit_card",
            brand: "",
            lastFourDigits: "",
            expiryMonth: "12",
            expiryYear: new Date().getFullYear().toString().substr(-2)
          };
          
          // Try to extract payment method details from transaction details
          const transactionDetails = paymentLog.transaction_details;
          if (transactionDetails && typeof transactionDetails === 'object') {
            // Safely access payment_method with type checks
            const td = transactionDetails as Record<string, any>;
            
            // Check if we have a payment_method object
            if (td.payment_method && typeof td.payment_method === 'object') {
              const pm = td.payment_method as Record<string, any>;
              paymentMethod = {
                type: "credit_card",
                brand: pm.brand || "",
                lastFourDigits: pm.last4 || "",
                expiryMonth: pm.expiryMonth || "12",
                expiryYear: pm.expiryYear || new Date().getFullYear().toString().substr(-2)
              };
            } 
            // Fall back to direct properties
            else {
              paymentMethod = {
                type: "credit_card",
                brand: td.card_brand as string || "",
                lastFourDigits: td.card_last_four as string || "",
                expiryMonth: "12",
                expiryYear: new Date().getFullYear().toString().substr(-2)
              };
            }
          }
          
          // Create a subscription record
          const { error: subscriptionError } = await supabase
            .from("subscriptions")
            .insert({
              user_id: user.id,
              plan_type: planType,
              status: planType === 'monthly' ? 'trial' : 'active',
              trial_ends_at: trialEnd?.toISOString(),
              current_period_ends_at: periodEnd?.toISOString(),
              payment_method: paymentMethod,
              contract_signed: true,
              contract_signed_at: now.toISOString()
            });
          
          if (subscriptionError) {
            console.error("Error creating subscription:", subscriptionError);
          } else {
            toast.success("המנוי שלך הופעל בהצלחה!");
            refetchSubscription();
          }
          
          // Mark all payment sessions as processed
          if (sessions?.length) {
            const sessionData = sessions[0];
            const paymentDetails = typeof sessionData.payment_details === 'object' ? 
              { ...(sessionData.payment_details as Record<string, any>), processed: true } : 
              { processed: true };
              
            await supabase
              .from('payment_sessions')
              .update({ payment_details: paymentDetails })
              .eq('id', sessionData.id);
          }
        }
      } catch (error) {
        console.error("Error checking pending payments:", error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkPendingPayments();
  }, [user, subscription, refetchSubscription]);

  if (loading || isChecking) {
    return (
      <div>
        <LoadingSkeleton />
        {isChecking && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {checkingMessage || 'טוען נתוני מנוי...'}
          </div>
        )}
      </div>
    );
  }

  // Check if user has registration data in progress
  const hasRegistrationInProgress = !!sessionStorage.getItem('registration_data');
  
  if (hasRegistrationInProgress) {
    return (
      <SubscriptionCard 
        title="השלם את תהליך ההרשמה" 
        description="התחלת את תהליך ההרשמה. אנא השלם את התהליך כדי לקבל גישה מלאה."
      >
        <div className="text-center py-6">
          <Button 
            onClick={() => navigate('/subscription')}
            className="mx-auto"
          >
            המשך להרשמה
          </Button>
        </div>
      </SubscriptionCard>
    );
  }

  if (!subscription) {
    return (
      <SubscriptionCard 
        title="אין לך מנוי פעיל" 
        description="הרשם עכשיו כדי לקבל גישה מלאה למערכת"
      >
        <div className="text-center py-6">
          <Button 
            onClick={() => navigate('/subscription')}
            className="mx-auto"
          >
            בחר תכנית מנוי
          </Button>
        </div>
      </SubscriptionCard>
    );
  }

  const showTrialStatus = subscription.status === 'trial';
  const isPaidPlan = subscription.status === 'active' && subscription.plan_type !== 'vip';
  const isVip = subscription.plan_type === 'vip';
  const isCancelled = subscription.status === 'cancelled';

  return (
    <SubscriptionCard
      title={`מנוי ${details?.planName || subscription.plan_type}`}
      description={`סטטוס: ${details?.statusText || subscription.status}`}
    >
      <>
        {showTrialStatus && details && (
          <SubscriptionStatus 
            status={subscription.status} 
            daysLeft={details.daysLeft} 
            progressValue={details.progressValue} 
          />
        )}
        
        <div className="grid grid-cols-1 gap-4 mt-4">
          {details && (
            <>
              {(isPaidPlan || showTrialStatus || isCancelled) && (
                <BillingInfo 
                  nextBillingDate={details.nextBillingDate} 
                  planPrice={details.planPrice}
                  currency="₪"
                />
              )}
              
              {isVip && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <h3 className="font-medium text-green-700 dark:text-green-300">מנוי VIP לכל החיים</h3>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    רכשת גישה ללא הגבלת זמן למערכת. אין צורך בחיוב נוסף.
                  </p>
                </div>
              )}
              
              {/* Show payment method for all subscription types */}
              <PaymentMethodInfo 
                paymentMethod={details.paymentMethod} 
              />
            </>
          )}
        </div>
        
        <SubscriptionFooter 
          subscriptionId={subscription.id}
          status={subscription.status}
          planType={subscription.plan_type}
          onCancelled={refetchSubscription}
        />
      </>
    </SubscriptionCard>
  );
};

export default UserSubscription;
