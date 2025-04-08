
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { getSubscriptionDetails, verifySubscriptionStatus } from '@/lib/subscription/verification-service';
import { toast } from 'sonner';

interface EnhancedSubscriptionContextType {
  status: {
    isActive: boolean;
    isTrial: boolean;
    isPeriodValid: boolean;
    isPaused: boolean;
    isGracePeriod: boolean;
    hasPaymentIssue: boolean;
    statusText: string;
    gracePeriodDays?: number;
  } | null;
  isLoading: boolean;
  hasActiveSubscription: boolean;
  refreshSubscription: () => Promise<void>;
  redirectToFix: () => void;
  details: any | null;
}

const EnhancedSubscriptionContext = createContext<EnhancedSubscriptionContextType | undefined>(undefined);

export const useEnhancedSubscription = (): EnhancedSubscriptionContextType => {
  const context = useContext(EnhancedSubscriptionContext);
  if (!context) {
    throw new Error('useEnhancedSubscription must be used within an EnhancedSubscriptionProvider');
  }
  return context;
};

interface EnhancedSubscriptionProviderProps {
  children: ReactNode;
}

export const EnhancedSubscriptionProvider: React.FC<EnhancedSubscriptionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<EnhancedSubscriptionContextType['status']>(null);
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSubscription = async () => {
    if (!user?.id) {
      setStatus(null);
      setDetails(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const subscriptionStatus = await verifySubscriptionStatus(user.id);
      setStatus(subscriptionStatus);

      const subscriptionDetails = await getSubscriptionDetails(user.id);
      setDetails(subscriptionDetails);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast.error('שגיאה בטעינת פרטי המנוי');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect to fix payment issues
  const redirectToFix = () => {
    navigate('/update-payment');
  };

  // Check subscription status when user changes
  useEffect(() => {
    refreshSubscription();
    
    // Set up subscription to real-time updates if needed
    if (user?.id) {
      const channel = supabase
        .channel('subscription-updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        }, () => {
          refreshSubscription();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const value: EnhancedSubscriptionContextType = {
    status,
    isLoading,
    hasActiveSubscription: !!status?.isActive,
    refreshSubscription,
    redirectToFix,
    details
  };

  return (
    <EnhancedSubscriptionContext.Provider value={value}>
      {children}
    </EnhancedSubscriptionContext.Provider>
  );
};
