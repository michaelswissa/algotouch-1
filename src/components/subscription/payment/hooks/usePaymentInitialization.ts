
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export const usePaymentInitialization = (
  selectedPlan: string,
  onPaymentComplete: () => void,
  onBack: () => void,
  setIsLoading: (loading: boolean) => void
) => {
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const { user } = useAuth();

  const initiateCardcomPayment = async () => {
    try {
      setIsLoading(true);
      setPaymentUrl(null);

      // Make sure we have authenticated user
      if (!user) {
        toast.error('יש להתחבר למערכת לפני ביצוע תשלום');
        onBack();
        return;
      }

      // Get user profile information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      // Determine amount based on plan (example amounts)
      let amount = 0;
      if (selectedPlan === 'monthly') {
        amount = 49.90;
      } else if (selectedPlan === 'annual') {
        amount = 499.00;
      } else {
        amount = 1.00; // Default for testing
      }

      // Combine first and last name for the full name
      const fullName = profile ? 
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 
        '';

      // Call the edge function to create a payment URL
      // CRITICAL: Always pass user.id as ReturnValue for webhook identification
      const { data, error } = await supabase.functions.invoke('cardcom-iframe-redirect', {
        body: {
          amount,
          userId: user.id,
          email: user.email,
          fullName,
          phone: profile?.phone || '',
          operation: "ChargeOnly", // Create a charge directly
          planId: selectedPlan,
          returnValue: user.id // ALWAYS pass user ID as return value for webhook identification
        }
      });

      if (error) {
        throw new Error(`Error generating payment URL: ${error.message}`);
      }

      if (!data?.url) {
        throw new Error('No payment URL returned from server');
      }

      console.log('Payment session created:', data);
      setPaymentUrl(data.url);

      // Store the session ID and low profile ID in localStorage for later reference
      if (data.sessionId) {
        localStorage.setItem('payment_session_id', data.sessionId);
      }
      if (data.lowProfileId) {
        localStorage.setItem('payment_low_profile_id', data.lowProfileId);
      }

    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast.error(`שגיאה ביצירת קישור תשלום: ${error.message}`);
      setPaymentUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    paymentUrl,
    initiateCardcomPayment
  };
};
