
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UsePaymentSessionProps {
  setState: (updater: any) => void;
}

export const usePaymentSession = ({ setState }: UsePaymentSessionProps) => {
  const initializePaymentSession = async (
    planId: string,
    userId: string | null,
    paymentUser: { email: string; fullName: string },
    operationType: 'payment' | 'token_only' = 'payment'
  ): Promise<{ lowProfileCode: string; sessionId: string; terminalNumber: string; reference: string }> => {
    console.log("Initializing payment for:", {
      planId,
      email: paymentUser.email,
      fullName: paymentUser.fullName,
      operationType
    });

    // Create an external unique ID for the transaction to prevent duplication
    // Format: userId-planId-timestamp-random
    const externalUniqId = userId 
      ? `${userId.split('-')[0]}-${planId}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`
      : `anon-${planId}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

    // Check for existing session in localStorage to prevent duplicate initialization
    try {
      const savedSessionStr = sessionStorage.getItem('payment_session');
      if (savedSessionStr) {
        const savedSession = JSON.parse(savedSessionStr);
        const age = Date.now() - savedSession.timestamp;
        
        // If we have a recent session (less than 5 minutes), check if it's still valid
        if (age < 5 * 60 * 1000 && savedSession.lowProfileCode) {
          // Verify session status with the backend
          const { data, error } = await supabase.functions.invoke('cardcom-status', {
            body: {
              lowProfileCode: savedSession.lowProfileCode,
              sessionId: savedSession.sessionId,
              terminalNumber: "160138"
            }
          });
          
          if (!error && data.exists) {
            console.log('Found existing payment session:', data);
            
            // If the session is still valid, reuse it
            if (data.status === 'pending' || data.status === 'initiated') {
              console.log('Reusing existing payment session');
              setState(prev => ({
                ...prev,
                sessionId: savedSession.sessionId,
                lowProfileCode: savedSession.lowProfileCode,
                terminalNumber: "160138",
                cardcomUrl: 'https://secure.cardcom.solutions',
                reference: savedSession.reference || '',
                paymentStatus: PaymentStatus.IDLE
              }));
              
              return { 
                lowProfileCode: savedSession.lowProfileCode, 
                sessionId: savedSession.sessionId,
                terminalNumber: "160138",
                reference: savedSession.reference || ''
              };
            }
          }
        }
        
        // Clear invalid or expired session
        sessionStorage.removeItem('payment_session');
      }
    } catch (e) {
      console.error('Error checking saved payment session:', e);
    }

    // Determine operation based on plan and operationType
    let operation = "ChargeOnly";
    let amount = 0;
    
    if (planId === 'monthly') {
      // Monthly plans use token creation with J2 validation (no actual charge)
      operation = operationType === 'token_only' ? "CreateTokenOnly" : "ChargeAndCreateToken";
      amount = operationType === 'token_only' ? 0 : 1; // Use 1 ILS for verification if charging
    } else if (planId === 'annual') {
      // Annual plans need to charge the full amount and create a token
      operation = "ChargeAndCreateToken";
      amount = 3371;
    } else {
      // VIP/Lifetime is a one-time charge, no token needed
      operation = "ChargeOnly";
      amount = 13121;
    }

    console.log('Creating payment session with:', {
      operation,
      amount,
      planId,
      externalUniqId
    });

    // Call CardCom payment initialization Edge Function
    const { data, error } = await supabase.functions.invoke('cardcom-payment', {
      body: {
        planId,
        amount: amount,
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
        externalUniqId: externalUniqId,
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
    
    // Save the session to localStorage for deduplication
    try {
      const paymentSession = {
        lowProfileCode: data.data.lowProfileCode,
        sessionId: data.data.sessionId,
        reference: data.data.reference || externalUniqId,
        timestamp: Date.now(),
        terminalNumber: terminalNumber,
        status: 'initiated'
      };
      sessionStorage.setItem('payment_session', JSON.stringify(paymentSession));
    } catch (e) {
      console.error('Error saving payment session:', e);
    }
    
    setState(prev => ({
      ...prev,
      sessionId: data.data.sessionId,
      lowProfileCode: data.data.lowProfileCode,
      terminalNumber: terminalNumber,
      cardcomUrl: data.data.cardcomUrl || 'https://secure.cardcom.solutions',
      reference: data.data.reference || externalUniqId,
      paymentStatus: PaymentStatus.IDLE
    }));
    
    return { 
      lowProfileCode: data.data.lowProfileCode, 
      sessionId: data.data.sessionId,
      terminalNumber: terminalNumber,
      reference: data.data.reference || externalUniqId
    };
  };

  return { initializePaymentSession };
};
