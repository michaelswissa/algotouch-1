
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { Spinner } from '@/components/ui/spinner';

interface SubscribedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const SubscribedRoute: React.FC<SubscribedRouteProps> = ({ 
  children, 
  redirectTo = '/subscription'
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.id) {
        setHasSubscription(false);
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error('Error checking subscription:', error);
          setHasSubscription(false);
        } else {
          // User has a subscription if the data exists, subscription status is active/trial, 
          // and either trial_ends_at is in the future or subscription is marked as unlimited
          const now = new Date();
          const trialEndsAt = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
          const currentPeriodEndsAt = data?.current_period_ends_at ? new Date(data.current_period_ends_at) : null;
          
          const isActive = data?.status === 'active' || data?.status === 'trial';
          const isValid = 
            (data?.status === 'trial' && trialEndsAt && trialEndsAt > now) || 
            (data?.status === 'active' && 
              (data.plan_type === 'vip' || (currentPeriodEndsAt && currentPeriodEndsAt > now))
            );
            
          setHasSubscription(isActive && isValid);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        setHasSubscription(false);
      } finally {
        setIsChecking(false);
      }
    };

    if (!loading) {
      checkSubscription();
    }
  }, [user?.id, loading]);

  if (loading || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (hasSubscription === false) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default SubscribedRoute;
