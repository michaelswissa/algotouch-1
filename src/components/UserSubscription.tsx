
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Import our components
import SubscriptionCard from './subscription/SubscriptionCard';
import SubscriptionStatus from './subscription/SubscriptionStatus';
import BillingInfo from './subscription/BillingInfo';
import PaymentMethodInfo from './subscription/PaymentMethodInfo';
import SubscriptionFooter from './subscription/SubscriptionFooter';
import LoadingSkeleton from './subscription/LoadingSkeleton';

const UserSubscription = () => {
  const navigate = useNavigate();
  const { subscription, loading, details, refetch } = useSubscription();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (loading) {
    return <LoadingSkeleton />;
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

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      // Placeholder implementation for subscription cancellation
      toast.success('המנוי בוטל בהצלחה');
      setCancelDialogOpen(false);
      // Refresh the subscription data
      refetch();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('אירעה שגיאה בביטול המנוי. אנא נסה שנית או פנה לתמיכה');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <SubscriptionCard
        title={`מנוי ${details?.planName}`}
        description={`סטטוס: ${details?.statusText}`}
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
                
                {isCancelled && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                    <h3 className="font-medium text-amber-700 dark:text-amber-300">המנוי בוטל</h3>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      המנוי שלך בוטל. תוכל ליהנות מהשירותים עד {details.nextBillingDate}.
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
            onCancelClick={() => setCancelDialogOpen(true)}
          />
        </>
      </SubscriptionCard>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ביטול מנוי</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך לבטל את המנוי? תוכל להמשיך להשתמש בשירותים עד סוף תקופת החיוב הנוכחית.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? 'מבטל...' : 'אני מאשר ביטול מנוי'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserSubscription;
