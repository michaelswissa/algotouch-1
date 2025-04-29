
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  isCheckingSubscription: boolean;
  error: Error | null;
  checkUserSubscription: (userId: string) => Promise<void>;
  fullName: string;
  setFullName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  resetSubscriptionState: () => void;
}

interface ProfileData {
  first_name?: string;
  last_name?: string;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const checkUserSubscription = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      setIsCheckingSubscription(true);
      setError(null);
      
      // Check subscription status
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('status, plan_type')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (subscriptionError) {
        console.error("Error fetching subscription:", subscriptionError);
        setError(new Error(subscriptionError.message));
        return;
      }
      
      // Determine if subscription is active
      setHasActiveSubscription(Boolean(
        subscriptionData && 
        (subscriptionData.status === 'active' || 
         subscriptionData.status === 'trial' || 
         subscriptionData.plan_type === 'vip')
      ));
      
      // Get user profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else if (profile) {
        const profileData = profile as ProfileData;
        if (profileData.first_name || profileData.last_name) {
          setFullName(`${profileData.first_name || ''} ${profileData.last_name || ''}`);
        }
      }

      // Get user email from auth.users
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error getting user data:", userError);
      } else if (userData?.user?.email) {
        setEmail(userData.user.email);
      }
    } catch (err) {
      console.error("Error in checkUserSubscription:", err);
      setError(err instanceof Error ? err : new Error('Unknown error checking subscription'));
    } finally {
      setIsCheckingSubscription(false);
    }
  }, []);

  const resetSubscriptionState = useCallback(() => {
    setHasActiveSubscription(false);
    setIsCheckingSubscription(false);
    setError(null);
    setFullName('');
    setEmail('');
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      hasActiveSubscription,
      isCheckingSubscription,
      error,
      checkUserSubscription,
      fullName,
      setFullName,
      email,
      setEmail,
      resetSubscriptionState
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
};
