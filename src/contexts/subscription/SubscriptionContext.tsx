
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface UserData {
  phone?: string;
  idNumber?: string;
  // Add other user data fields as needed
}

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  isCheckingSubscription: boolean;
  checkUserSubscription: (userId: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  fullName: string | null;
  email: string | null;
  subscriptionDetails: any | null;
  planType: string | null;
  userData: UserData | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState<boolean>(true);
  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Check subscription on user change
  useEffect(() => {
    if (user?.id) {
      console.log("User ID detected, checking subscription:", user.id);
      checkUserSubscription(user.id);
      setEmail(user.email || null);
      
      // Get user profile data
      supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching user profile:', error);
            return;
          }
          
          if (data) {
            // Ensure data is properly type checked
            const profileData = data as {
              first_name?: string | null;
              last_name?: string | null;
              phone?: string | null;
            };
            
            if (profileData.first_name || profileData.last_name) {
              setFullName(`${profileData.first_name || ''} ${profileData.last_name || ''}`.trim());
            }
            
            // Set user data with available fields
            setUserData({
              phone: profileData.phone || '',
              // For now, we'll use an empty string as id_number isn't available
              idNumber: ''
            });

            console.log('Profile data loaded:', profileData);
          }
        });
    } else {
      console.log("No user ID, resetting subscription state");
      setHasActiveSubscription(false);
      setFullName(null);
      setEmail(null);
      setSubscriptionDetails(null);
      setPlanType(null);
      setUserData(null);
      setIsCheckingSubscription(false);
    }
  }, [user]);

  const refreshSubscription = async () => {
    if (user?.id) {
      console.log("Refreshing subscription for user:", user.id);
      await checkUserSubscription(user.id);
    }
  };

  const checkUserSubscription = async (userId: string) => {
    try {
      setIsCheckingSubscription(true);
      console.log(`Checking subscription for user ID: ${userId}`);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (error) {
        throw error;
      }
      
      console.log("Subscription data retrieved:", data);
      
      if (!data) {
        // No subscription found
        console.log("No subscription found");
        setHasActiveSubscription(false);
        setSubscriptionDetails(null);
        setPlanType(null);
        return;
      }
      
      // Determine if subscription is active
      const now = new Date();
      const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
      const currentPeriodEndsAt = data.current_period_ends_at ? new Date(data.current_period_ends_at) : null;
      
      const isActive = data.status === 'active';
      const isTrial = data.status === 'trial' && trialEndsAt && trialEndsAt > now;
      const isValidPeriod = currentPeriodEndsAt && currentPeriodEndsAt > now;
      const isCancelled = data.cancelled_at !== null && data.cancelled_at !== undefined;
      
      const activeStatus = isActive || isTrial || (isValidPeriod && !isCancelled);
      console.log(`Subscription status: ${activeStatus ? 'active' : 'inactive'}`, {
        isActive,
        isTrial,
        isValidPeriod,
        isCancelled,
        status: data.status,
        trialEndsAt: trialEndsAt?.toISOString(),
        currentPeriodEndsAt: currentPeriodEndsAt?.toISOString()
      });
      
      setHasActiveSubscription(activeStatus);
      setSubscriptionDetails(data);
      setPlanType(data.plan_type);
      
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast.error('שגיאה בבדיקת פרטי המנוי');
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  const value = {
    hasActiveSubscription,
    isCheckingSubscription,
    checkUserSubscription,
    refreshSubscription,
    fullName,
    email,
    subscriptionDetails,
    planType,
    userData
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
