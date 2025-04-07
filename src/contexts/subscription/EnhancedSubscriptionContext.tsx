
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { verifySubscriptionStatus, SubscriptionStatus } from '@/lib/subscription/verification-service';

interface EnhancedSubscriptionContextType {
  status: SubscriptionStatus | null;
  isChecking: boolean;
  refreshStatus: () => Promise<void>;
  redirectToFix: () => void;
  showPaymentUpdateBanner: boolean;
  dismissPaymentBanner: () => void;
}

const EnhancedSubscriptionContext = createContext<EnhancedSubscriptionContextType | undefined>(undefined);

export const useEnhancedSubscription = () => {
  const context = useContext(EnhancedSubscriptionContext);
  if (!context) {
    throw new Error('useEnhancedSubscription must be used within EnhancedSubscriptionProvider');
  }
  return context;
};

interface EnhancedSubscriptionProviderProps {
  children: React.ReactNode;
}

export const EnhancedSubscriptionProvider: React.FC<EnhancedSubscriptionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showPaymentUpdateBanner, setShowPaymentUpdateBanner] = useState(false);

  const refreshStatus = async () => {
    if (!user?.id) {
      setStatus(null);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    try {
      const result = await verifySubscriptionStatus(user.id);
      setStatus(result);
      setShowPaymentUpdateBanner(result.requiresPaymentUpdate);
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Check subscription status when the user changes
  useEffect(() => {
    refreshStatus();
  }, [user?.id]);

  // Set up a real-time listener for payment history changes
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase
      .channel('payment-events')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'payment_history',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new?.status === 'failed') {
            refreshStatus();
            toast.error('התשלום נכשל. יש לעדכן את פרטי התשלום.');
          } else if (payload.new?.status === 'completed') {
            refreshStatus();
            toast.success('התשלום התקבל בהצלחה!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const redirectToFix = () => {
    if (status?.redirectTo) {
      navigate(status.redirectTo);
    }
  };

  const dismissPaymentBanner = () => {
    setShowPaymentUpdateBanner(false);
  };

  return (
    <EnhancedSubscriptionContext.Provider
      value={{
        status,
        isChecking,
        refreshStatus,
        redirectToFix,
        showPaymentUpdateBanner,
        dismissPaymentBanner
      }}
    >
      {children}
    </EnhancedSubscriptionContext.Provider>
  );
};
