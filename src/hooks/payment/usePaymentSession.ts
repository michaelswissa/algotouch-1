
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { PlanType } from '@/types/payment';

interface UsePaymentSessionProps {
  setState: (updater: any) => void;
}

// Helper to get stored session from localStorage
const getStoredPaymentSession = () => {
  try {
    const sessionData = localStorage.getItem('payment_session');
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    
    // Check if session has expired
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      localStorage.removeItem('payment_session');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error retrieving payment session:', error);
    localStorage.removeItem('payment_session');
    return null;
  }
};

export const usePaymentSession = ({ setState }: UsePaymentSessionProps) => {
  const [isInitializing, setIsInitializing] = useState(false);
  
  const initializePaymentSession = async (
    planId: string,
    userId: string | null,
    paymentUser: { email: string; fullName: string },
    operationType: 'payment' | 'token_only' = 'payment'
  ): Promise<{ lowProfileCode: string; sessionId: string; terminalNumber: string; reference: string }> => {
    // Check if we have a stored session that we can reuse
    const storedSession = getStoredPaymentSession();
    if (storedSession && storedSession.planId === planId && storedSession.status === 'initiated') {
      console.log("Reusing stored payment session:", storedSession);
      
      setState(prev => ({
        ...prev,
        sessionId: storedSession.sessionId,
        lowProfileCode: storedSession.lowProfileCode,
        terminalNumber: storedSession.terminalNumber,
        cardcomUrl: storedSession.cardcomUrl || 'https://secure.cardcom.solutions',
        reference: storedSession.reference || '',
        paymentStatus: PaymentStatus.IDLE
      }));
      
      return { 
        lowProfileCode: storedSession.lowProfileCode, 
        sessionId: storedSession.sessionId,
        terminalNumber: storedSession.terminalNumber,
        reference: storedSession.reference || ''
      };
    }
    
    // If no valid stored session, create a new one
    setIsInitializing(true);
    
    try {
      console.log("Initializing payment for:", {
        planId,
        email: paymentUser.email,
        fullName: paymentUser.fullName,
        operationType
      });

      // Determine operation based on plan and operationType
      let operation = "ChargeOnly"; // Default for VIP (one-time payment)
      let amount = 0;
      
      if (planId === 'monthly') {
        operation = "CreateTokenOnly"; // Only token for monthly plan with trial
        amount = 0; // Just validate the card, no charge
      } else if (planId === 'annual') {
        operation = "ChargeAndCreateToken"; // Create token and charge for annual plan
        amount = 3371; // Annual plan price
      } else if (planId === 'vip') {
        operation = "ChargeOnly"; // One-time payment for lifetime plan
        amount = 13121; // VIP plan price
      }
      
      console.log(`Using operation ${operation} for plan ${planId}`);

      // Call CardCom payment initialization Edge Function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount,
          invoiceInfo: {
            fullName: paymentUser.fullName || paymentUser.email,
            email: paymentUser.email,
          },
          currency: "ILS",
          operation: operation,
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          userId: userId,
          operationType,
          registrationData: sessionStorage.getItem('registration_data') 
            ? JSON.parse(sessionStorage.getItem('registration_data')!) 
            : null
        }
      });
      
      if (error || !data?.success) {
        console.error("Payment initialization error:", error || data?.message);
        throw new Error(error?.message || data?.message || 'אירעה שגיאה באתחול התשלום');
      }
      
      console.log("Payment session created:", data.data);
      
      if (!data.data || !data.data.lowProfileCode) {
        console.error("Missing lowProfileCode in payment session response");
        throw new Error('חסר מזהה יחודי לעסקה בתגובה מהשרת');
      }
      
      // Always use the fixed terminal number for CardCom
      const terminalNumber = data.data.terminalNumber || '160138';
      
      // Store the session in localStorage to prevent reinitializing
      const sessionToStore = {
        lowProfileCode: data.data.lowProfileCode,
        sessionId: data.data.sessionId,
        terminalNumber: terminalNumber,
        cardcomUrl: data.data.cardcomUrl || 'https://secure.cardcom.solutions',
        reference: data.data.reference || '',
        planId,
        status: 'initiated',
        expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 minutes expiry
      };
      
      localStorage.setItem('payment_session', JSON.stringify(sessionToStore));
      
      setState(prev => ({
        ...prev,
        sessionId: data.data.sessionId,
        lowProfileCode: data.data.lowProfileCode,
        terminalNumber: terminalNumber,
        cardcomUrl: data.data.cardcomUrl || 'https://secure.cardcom.solutions',
        reference: data.data.reference || '',
        paymentStatus: PaymentStatus.IDLE
      }));
      
      return { 
        lowProfileCode: data.data.lowProfileCode, 
        sessionId: data.data.sessionId,
        terminalNumber: terminalNumber,
        reference: data.data.reference || ''
      };
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      throw error;
    } finally {
      setIsInitializing(false);
    }
  };

  const clearPaymentSession = () => {
    localStorage.removeItem('payment_session');
  };
  
  const getPaymentStatus = async (lowProfileCode: string): Promise<any> => {
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode
        }
      });
      
      if (error) {
        console.error("Error checking payment status:", error);
        return { success: false, error: error.message };
      }
      
      return data;
    } catch (error: any) {
      console.error("Payment status check error:", error);
      return { success: false, error: error.message };
    }
  };

  return { 
    initializePaymentSession,
    clearPaymentSession,
    getPaymentStatus,
    isInitializing
  };
};
