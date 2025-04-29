
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
  
  // Additional properties for subscription flow
  currentStep: string;
  selectedPlan: string | null;
  handlePlanSelected: (planId: string | null) => void;
  handleContractSigned: (signed: boolean) => void;
  handlePaymentComplete: () => void;
  loading: boolean;
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

  // Additional state for subscription flow
  const [currentStep, setCurrentStep] = useState<string>('plan'); // Initial step
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setCurrentStep('plan');
    setSelectedPlan(null);
  }, []);

  // Handle plan selection
  const handlePlanSelected = useCallback((planId: string | null) => {
    setSelectedPlan(planId);
    if (planId) {
      setCurrentStep('contract');
    } else {
      setCurrentStep('plan');
    }
  }, []);

  // Handle contract signing
  const handleContractSigned = useCallback((signed: boolean) => {
    if (signed) {
      setCurrentStep('payment');
    } else {
      setCurrentStep('contract');
    }
  }, []);

  // Handle payment completion
  const handlePaymentComplete = useCallback(() => {
    setCurrentStep('success');
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
      resetSubscriptionState,
      // Additional properties
      currentStep,
      selectedPlan,
      handlePlanSelected,
      handleContractSigned,
      handlePaymentComplete,
      loading
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
