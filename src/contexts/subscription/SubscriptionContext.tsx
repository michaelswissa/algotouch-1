
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface UserData {
  phone?: string;
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
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
  lastRefreshed: Date | null;
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
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Check subscription on user change
  useEffect(() => {
    if (user?.id) {
      checkUserSubscription(user.id);
      setEmail(user.email || null);
      
      // Get user profile data
      supabase
        .from('profiles')
        .select('first_name, last_name, phone, id_number')
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
              id_number?: string | null;
            };
            
            if (profileData.first_name || profileData.last_name) {
              setFullName(`${profileData.first_name || ''} ${profileData.last_name || ''}`.trim());
            }
            
            // Set user data with available fields
            setUserData({
              phone: profileData.phone || '',
              idNumber: profileData.id_number || '',
              firstName: profileData.first_name || '',
              lastName: profileData.last_name || '',
              email: user.email || ''
            });

            console.log('Profile data loaded:', profileData);
          }
        });
        
      // Set up periodic subscription check
      const checkInterval = setInterval(() => {
        checkUserSubscription(user.id);
      }, 300000); // Every 5 minutes
      
      return () => clearInterval(checkInterval);
    } else {
      setHasActiveSubscription(false);
      setFullName(null);
      setEmail(null);
      setSubscriptionDetails(null);
      setPlanType(null);
      setUserData(null);
      setIsCheckingSubscription(false);
      setLastRefreshed(null);
    }
  }, [user]);

  const refreshSubscription = async () => {
    if (user?.id) {
      await checkUserSubscription(user.id);
    }
  };

  const checkUserSubscription = async (userId: string) => {
    try {
      setIsCheckingSubscription(true);
      
      // Use maybeSingle to avoid errors if no subscription exists
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (error) {
        console.error('Error checking subscription:', error);
        throw error;
      }
      
      if (!data) {
        // No subscription found
        setHasActiveSubscription(false);
        setSubscriptionDetails(null);
        setPlanType(null);
        setLastRefreshed(new Date());
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
      
      const activeStatus = (isActive || isTrial || isValidPeriod) && !isCancelled;
      
      setHasActiveSubscription(activeStatus);
      setSubscriptionDetails(data);
      setPlanType(data.plan_type);
      setLastRefreshed(new Date());
      
      // Check if we have a valid recurring payment token
      if (isActive && !data.token) {
        console.log('Active subscription without token, checking recurring_payments');
        
        // Try to find a token in recurring_payments
        const { data: recurringPayments } = await supabase
          .from('recurring_payments')
          .select('token, token_expiry, is_valid')
          .eq('user_id', userId)
          .eq('is_valid', true)
          .gte('token_expiry', new Date().toISOString().split('T')[0])
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (recurringPayments && recurringPayments.length > 0) {
          console.log('Found valid token in recurring_payments, syncing to subscription');
          
          // Update subscription with token
          await supabase
            .from('subscriptions')
            .update({
              token: recurringPayments[0].token,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.id);
        }
      }
      
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
    userData,
    lastRefreshed
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
