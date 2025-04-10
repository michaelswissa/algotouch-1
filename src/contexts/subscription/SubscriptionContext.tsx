
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  isCheckingSubscription: boolean;
  checkUserSubscription: (userId: string) => Promise<void>;
  fullName: string;
  setFullName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  resetSubscriptionState: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const checkUserSubscription = async (userId: string) => {
    if (!userId) return;
    
    try {
      setIsCheckingSubscription(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data && !error) {
        setHasActiveSubscription(true);
      } else {
        setHasActiveSubscription(false);
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
      
      if (profile) {
        setFullName(`${profile.first_name || ''} ${profile.last_name || ''}`);
      }

      // Get user email from auth.users
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.email) {
        setEmail(user.user.email);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  const resetSubscriptionState = () => {
    setHasActiveSubscription(false);
    setIsCheckingSubscription(false);
    setFullName('');
    setEmail('');
  };

  return (
    <SubscriptionContext.Provider value={{
      hasActiveSubscription,
      isCheckingSubscription,
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
